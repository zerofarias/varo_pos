-- AlterTable
ALTER TABLE `products` ADD COLUMN `is_favorite` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `afip_cae` VARCHAR(191) NULL,
    ADD COLUMN `afip_cae_expiration` DATETIME(3) NULL,
    ADD COLUMN `afip_error` TEXT NULL,
    ADD COLUMN `afip_qr_data` TEXT NULL,
    ADD COLUMN `afip_status` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `avatar` LONGTEXT NULL;
