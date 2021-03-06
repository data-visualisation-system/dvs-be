import { Injectable, Scope } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WidgetEntity } from 'src/widget/widget.entity';
import { AxiosResponse } from 'axios';
import { combineLatest, lastValueFrom, map, Observable } from 'rxjs';
import { WidgetDto } from 'src/widget/widget.dto';

@Injectable({ scope: Scope.REQUEST })
export class WidgetService {
  constructor(
    @InjectRepository(WidgetEntity)
    private widgetRepository: Repository<WidgetEntity>,
    private httpService: HttpService,
  ) {}

  async getWidgetData(key: string) {
    const widgetDataStream = this.getOne(key);
    let httpResponse: Observable<AxiosResponse>;
    let mappedHttpResponse: Observable<
      { label: string; value: number | any }[]
    >;

    httpResponse = this.getHttpRequest(
      (await widgetDataStream).method,
      (await widgetDataStream).url,
    );

    httpResponse = httpResponse.pipe(map((data) => data.data));

    httpResponse = this.mapToArray(
      (await widgetDataStream).customAttribute,
      httpResponse,
    );

    mappedHttpResponse = this.setCustomLabelAndValue(
      (await widgetDataStream).customLabel,
      (await widgetDataStream).customValue,
      httpResponse,
    );

    mappedHttpResponse = this.filterInvalid(mappedHttpResponse);

    const min: Observable<number> = this.getMinValue(
      (await widgetDataStream).customMin,
      mappedHttpResponse,
    );

    const max: Observable<number> = this.getMaxValue(
      (await widgetDataStream).customMax,
      mappedHttpResponse,
    );

    const errors = {};

    return await this.mapResponse(
      mappedHttpResponse,
      min,
      max,
      errors,
      await widgetDataStream,
    );
  }

  async getAllPrivate(author: string): Promise<WidgetEntity[]> {
    return await this.widgetRepository.findBy({ author });
  }

  async getAll(): Promise<WidgetEntity[]> {
    return await this.widgetRepository.findBy({ isPublic: true });
  }

  async create(widget: WidgetDto): Promise<WidgetEntity> {
    return await this.widgetRepository.save(widget);
  }

  async getOne(key: string): Promise<WidgetEntity> {
    return this.widgetRepository.findOneBy({
      key,
    });
  }

  async update(id: number, product: WidgetDto): Promise<UpdateResult> {
    return await this.widgetRepository.update(id, product);
  }

  async delete(id: number): Promise<DeleteResult> {
    return await this.widgetRepository.delete(id);
  }

  private mapResponse(
    httpResponse: Observable<{ label: string; value: number }[]>,
    min: Observable<number>,
    max: Observable<number>,
    errors: Record<string, unknown>,
    widgetData: WidgetEntity,
  ): Promise<{
    data: { value: number; label: string }[];
    min: number;
    max: number;
    errors: Record<string, unknown>;
  }> {
    return lastValueFrom(
      combineLatest([httpResponse, min, max]).pipe(
        map(([data, min, max]) => ({
          data: (widgetData.takeFromStart ? data : data.reverse()).filter(
            (_, index) => !widgetData.maxItems || index < widgetData.maxItems,
          ),
          min,
          max,
          errors,
          widgetType: widgetData.widgetType,
          customPrimaryColor: widgetData.customPrimaryColor,
          customSecondaryColor: widgetData.customSecondaryColor,
          customNegativePrimaryColor: widgetData.customNegativePrimaryColor,
          customNegativeSecondaryColor: widgetData.customNegativeSecondaryColor,
          markNegativeDifferently: widgetData.markNegativeDifferently,
          showLabels: widgetData.showLabels,
          showPeriods: widgetData.showPeriods,
          customLegend: widgetData.customLegend,
          showYGrid: widgetData.showYGrid,
          showXGrid: widgetData.showXGrid,
          markFirst: widgetData.markFirst,
          markLast: widgetData.markLast,
          title: widgetData.title,
        })),
      ),
    );
  }

  private getMaxValue(
    customMax: number,
    httpResponse: Observable<{ label: string; value: number }[]>,
  ): Observable<number> {
    return httpResponse?.pipe(
      map((data: { label: string; value: number }[]) => {
        if (customMax) {
          return customMax;
        }

        let max = data[0]?.value;

        data.forEach((d) => (max = d.value > max ? d.value : max));

        return max;
      }),
    );
  }

  private getMinValue(
    customMin: number,
    httpResponse: Observable<{ label: string; value: number }[]>,
  ): Observable<number> {
    return httpResponse?.pipe(
      map((data: { label: string; value: number }[]) => {
        if (typeof customMin === 'number') {
          return customMin;
        }

        let min = data[0].value;

        data.forEach((d) => (min = d.value < min ? d.value : min));

        return min;
      }),
    );
  }

  private filterInvalid(
    httpResponse: Observable<{ label: string; value: number | any }[]>,
  ): Observable<{ label: string; value: number }[]> {
    return httpResponse?.pipe(
      map((data: { label: string; value: any }[]) =>
        data.filter((d) => typeof d.value === 'number' && !!d.label),
      ),
    );
  }

  private setCustomLabelAndValue(
    customLabel: string,
    customValue: string,
    httpResponse: Observable<AxiosResponse>,
  ): Observable<{ label: string; value: any }[]> {
    return httpResponse?.pipe(
      map((data) =>
        (data as unknown as { label: string; value: any }[]).map((object) => ({
          label: object[customLabel] ?? object['label'],
          value: object[customValue] ?? object['value'],
        })),
      ),
    );
  }

  private mapToArray(
    customAttribute: string,
    httpResponse: Observable<AxiosResponse>,
  ): Observable<AxiosResponse> {
    return httpResponse.pipe(
      map((dataObject) => {
        const properties = customAttribute ? customAttribute?.split('.') : [];
        let dataArray = dataObject;

        if (properties.length > 0) {
          properties.forEach((property: string) => {
            dataArray = dataArray[property];
          });
        }
        return dataArray;
      }),
    );
  }

  private getHttpRequest(
    method: string,
    url: string,
  ): Observable<AxiosResponse> {
    if (method === 'POST') {
      return this.httpService.post(url);
    } else {
      return this.httpService.get(url);
    }
  }
}
