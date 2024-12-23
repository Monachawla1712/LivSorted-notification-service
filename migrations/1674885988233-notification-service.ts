import { MigrationInterface, QueryRunner } from 'typeorm';

export class notificationService1674885988233 implements MigrationInterface {
  name = 'notificationService1674885988233';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TYPE "notification"."notification_channel_enum" AS ENUM('PN', 'SMS', 'EMAIL', 'WHATSAPP')
        `);
    await queryRunner.query(`
            CREATE TABLE "notification"."template" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "channel" "notification"."notification_channel_enum" NOT NULL,
                "is_active" boolean NOT NULL DEFAULT true,
                "title" character varying,
                "body" character varying,
                "url" character varying,
                CONSTRAINT "UQ_a62147c0d6b868e797061e142a1" UNIQUE ("name"),
                CONSTRAINT "PK_fbae2ac36bd9b5e1e793b957b7f" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_a62147c0d6b868e797061e142a" ON "notification"."template" ("name")
        `);
    await queryRunner.query(`
            CREATE TYPE "notification"."notification_status_enum" AS ENUM('SENT', 'DELIVERED', 'SEEN', 'FAILED')
        `);
    await queryRunner.query(`
            CREATE TABLE "notification"."log" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "user_identity" character varying NOT NULL,
                "template_name" character varying NOT NULL,
                "channel" "notification"."notification_channel_enum" NOT NULL,
                "title" character varying,
                "body" character varying,
                "status" "notification"."notification_status_enum" NOT NULL,
                "template_id" uuid NOT NULL,
                CONSTRAINT "PK_350604cbdf991d5930d9e618fbd" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "notification"."clevertap_log" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "request" json NOT NULL,
                "response" json NOT NULL,
                CONSTRAINT "PK_49f1c0782acf12032045a678361" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "notification"."log"
            ADD CONSTRAINT "FK_f05470789fdc31d75dda254de85" FOREIGN KEY ("template_id") REFERENCES "notification"."template"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "notification"."log" DROP CONSTRAINT "FK_f05470789fdc31d75dda254de85"
        `);
    await queryRunner.query(`
            DROP TABLE "notification"."clevertap_log"
        `);
    await queryRunner.query(`
            DROP TABLE "notification"."log"
        `);
    await queryRunner.query(`
            DROP TYPE "notification"."notification_status_enum"
        `);
    await queryRunner.query(`
            DROP TYPE "notification"."notification_channel_enum"
        `);
    await queryRunner.query(`
            DROP INDEX "notification"."IDX_a62147c0d6b868e797061e142a"
        `);
    await queryRunner.query(`
            DROP TABLE "notification"."template"
        `);
  }
}
