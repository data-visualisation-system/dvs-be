import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class WidgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: number;

  @Column({ unique: true })
  key: string;

  @Column()
  isPublic: boolean;

  @Column()
  takeFromStart: boolean;

  @Column()
  url: string;

  @Column()
  method: string;

  @Column({ nullable: true })
  customAttribute: string;

  @Column({ nullable: true })
  customValue: string;

  @Column({ nullable: true })
  customLabel: string;

  @Column({ nullable: true })
  customMin: number;

  @Column({ nullable: true })
  customMax: number;

  // @Column()
  // headers: { [key: string]: string }[];

  @CreateDateColumn()
  createdAt: string;

  @UpdateDateColumn()
  updatedAt: string;
}