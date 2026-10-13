import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import {
  UNIT_AREA_MAX,
  UNIT_AREA_MIN,
} from '../../common/constants/validation.constants.js';
import { Property } from '../../properties/entities/property.entity.js';
import { UnitStatus } from '../enums/unit-status.enum.js';
import { ImageRef } from '../../common/uploads/image-ref.interface.js';

@Entity('units')
@Unique(['propertyId', 'unitNumber'])
@Check(`"area" >= ${UNIT_AREA_MIN} AND "area" <= ${UNIT_AREA_MAX}`)
export class Unit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  unitNumber: string;

  @Column({ type: 'int', nullable: true })
  floor: number | null;

  @Column({ type: 'integer' })
  area: number;

  @Index()
  @Column({ type: 'smallint' })
  bedrooms: number;

  @Column({ type: 'smallint' })
  bathrooms: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'uuid' })
  propertyId: string;

  @ManyToOne(() => Property, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({ name: 'propertyId' })
  property: Property;

  @Index()
  @Column({ type: 'enum', enum: UnitStatus, default: UnitStatus.AVAILABLE })
  status: UnitStatus;

  @Column({ type: 'integer' })
  rentAmount: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  images: ImageRef[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
