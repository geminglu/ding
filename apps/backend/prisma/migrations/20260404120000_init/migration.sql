-- CreateTable
CREATE TABLE `WeappUser` (
    `id` VARCHAR(191) NOT NULL,
    `openid` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WeappUser_openid_key`(`openid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotifyKey` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'ROTATED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `NotifyKey_key_key`(`key`),
    INDEX `NotifyKey_userId_idx`(`userId`),
    INDEX `NotifyKey_status_idx`(`status`),
    INDEX `NotifyKey_userId_status_idx`(`userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `NotifyKey` ADD CONSTRAINT `NotifyKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `WeappUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
