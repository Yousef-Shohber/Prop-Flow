import { MigrationInterface, QueryRunner } from "typeorm";

export class Final1791842749878 implements MigrationInterface {
    name = 'Final1791842749878'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "roleSelected" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "users" ADD "ownerVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE 'PROPERTY_UPDATED'`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE 'UNIT_UPDATED'`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE 'OWNER_VERIFICATION_CHANGED'`);
        await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "area"`);
        await queryRunner.query(`ALTER TABLE "units" ADD "area" integer NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'RENTAL_REQUEST_EXPIRED'`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum" ADD VALUE 'OWNER_VERIFICATION_CHANGED'`);
        await queryRunner.query(`ALTER TYPE "public"."rental_requests_status_enum" ADD VALUE 'EXPIRED'`);
        await queryRunner.query(`ALTER TABLE "units" ADD CONSTRAINT "CHK_483fac08e706502f28dca7df32" CHECK ("area" >= 1 AND "area" <= 9999)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "units" DROP CONSTRAINT "CHK_483fac08e706502f28dca7df32"`);
        await queryRunner.query(`CREATE TYPE "public"."rental_requests_status_enum_old" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')`);
        await queryRunner.query(`ALTER TABLE "rental_requests" ALTER COLUMN "status" TYPE "public"."rental_requests_status_enum_old" USING "status"::"text"::"public"."rental_requests_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."rental_requests_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."rental_requests_status_enum_old" RENAME TO "rental_requests_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum_old" AS ENUM('LEASE_CREATED', 'LEASE_ACTIVATED', 'LEASE_TERMINATED', 'MAINTENANCE_CREATED', 'MAINTENANCE_ASSIGNED', 'MAINTENANCE_RESOLVED', 'RENTAL_REQUEST_CREATED', 'RENTAL_REQUEST_APPROVED', 'RENTAL_REQUEST_REJECTED', 'LEASE_RENEWED', 'MAINTENANCE_STARTED', 'MAINTENANCE_CLOSED', 'MAINTENANCE_CANCELLED', 'RENTAL_REQUEST_CANCELLED', 'LEASE_RENEWAL_REQUESTED', 'LEASE_RENEWAL_REJECTED', 'LEASE_RENEWAL_CANCELLED')`);
        await queryRunner.query(`ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "public"."notifications_type_enum_old" USING "type"::"text"::"public"."notifications_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."notifications_type_enum_old" RENAME TO "notifications_type_enum"`);
        await queryRunner.query(`ALTER TABLE "units" DROP COLUMN "area"`);
        await queryRunner.query(`ALTER TABLE "units" ADD "area" numeric(10,2) NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum_old" AS ENUM('PROPERTY_CREATED', 'PROPERTY_DELETED', 'LEASE_CREATED', 'LEASE_ACTIVATED', 'LEASE_TERMINATED', 'USER_STATUS_CHANGED', 'UNIT_STATUS_CHANGED', 'MAINTENANCE_ASSIGNED', 'MAINTENANCE_COMPLETED', 'ROLE_CHANGED', 'RENTAL_REQUEST_CREATED', 'RENTAL_REQUEST_APPROVED', 'RENTAL_REQUEST_REJECTED', 'UNIT_CREATED', 'UNIT_DELETED', 'LEASE_RENEWED', 'RENTAL_REQUEST_CANCELLED', 'LEASE_RENEWAL_REQUESTED', 'LEASE_RENEWAL_REJECTED', 'LEASE_RENEWAL_CANCELLED')`);
        await queryRunner.query(`ALTER TABLE "audit_logs" ALTER COLUMN "action" TYPE "public"."audit_logs_action_enum_old" USING "action"::"text"::"public"."audit_logs_action_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum_old" RENAME TO "audit_logs_action_enum"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ownerVerified"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roleSelected"`);
    }

}
