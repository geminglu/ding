-- CreateTable
CREATE TABLE `AppUser` (
    `id` VARCHAR(191) NOT NULL,
    `notifyKey` VARCHAR(191) NOT NULL,
    `restoreCode` VARCHAR(191) NOT NULL,
    `notifyKeyStatus` ENUM('ACTIVE', 'ROTATED') NOT NULL DEFAULT 'ACTIVE',
    `notifyKeyRotatedAt` DATETIME(3) NULL,
    `trialStartedAt` DATETIME(3) NOT NULL,
    `trialEndsAt` DATETIME(3) NOT NULL,
    `entitlementStatus` ENUM('TRIALING', 'ACTIVE', 'EXPIRED', 'GRACE_PERIOD') NOT NULL DEFAULT 'TRIALING',
    `entitlementExpiresAt` DATETIME(3) NULL,
    `currentPlan` ENUM('MONTHLY', 'YEARLY') NULL,
    `platformSource` ENUM('IOS', 'ANDROID') NULL,
    `lastRestoreAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppUser_notifyKey_key`(`notifyKey`),
    UNIQUE INDEX `AppUser_restoreCode_key`(`restoreCode`),
    INDEX `AppUser_entitlementStatus_idx`(`entitlementStatus`),
    INDEX `AppUser_trialEndsAt_idx`(`trialEndsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppInstallation` (
    `id` VARCHAR(191) NOT NULL,
    `appUserId` VARCHAR(191) NOT NULL,
    `installationId` VARCHAR(191) NOT NULL,
    `platform` ENUM('IOS', 'ANDROID', 'UNKNOWN') NOT NULL,
    `deviceName` VARCHAR(191) NULL,
    `appVersion` VARCHAR(191) NULL,
    `pushToken` VARCHAR(191) NULL,
    `pushProvider` ENUM('EXPO') NOT NULL DEFAULT 'EXPO',
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppInstallation_installationId_key`(`installationId`),
    INDEX `AppInstallation_appUserId_idx`(`appUserId`),
    INDEX `AppInstallation_platform_idx`(`platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionOrder` (
    `id` VARCHAR(191) NOT NULL,
    `appUserId` VARCHAR(191) NOT NULL,
    `platform` ENUM('IOS', 'ANDROID') NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `providerCustomerId` VARCHAR(191) NULL,
    `storeTransactionId` VARCHAR(191) NULL,
    `originalTransactionId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELED', 'RESTORED', 'PENDING') NOT NULL,
    `plan` ENUM('MONTHLY', 'YEARLY') NOT NULL,
    `purchasedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `isSandbox` BOOLEAN NOT NULL DEFAULT false,
    `rawPayload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionOrder_appUserId_platform_productId_key`(`appUserId`, `platform`, `productId`),
    INDEX `SubscriptionOrder_appUserId_status_idx`(`appUserId`, `status`),
    INDEX `SubscriptionOrder_platform_productId_idx`(`platform`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotifyDeliveryLog` (
    `id` VARCHAR(191) NOT NULL,
    `appUserId` VARCHAR(191) NOT NULL,
    `installationId` VARCHAR(191) NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `status` ENUM('SENT', 'FAILED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `NotifyDeliveryLog_appUserId_createdAt_idx`(`appUserId`, `createdAt`),
    INDEX `NotifyDeliveryLog_requestId_idx`(`requestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RestoreEvent` (
    `id` VARCHAR(191) NOT NULL,
    `appUserId` VARCHAR(191) NOT NULL,
    `installationId` VARCHAR(191) NULL,
    `type` ENUM('RESTORE_CODE', 'STORE_RESTORE') NOT NULL,
    `platform` ENUM('IOS', 'ANDROID', 'UNKNOWN') NOT NULL,
    `result` ENUM('SUCCESS', 'FAILED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RestoreEvent_appUserId_createdAt_idx`(`appUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AppInstallation` ADD CONSTRAINT `AppInstallation_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubscriptionOrder` ADD CONSTRAINT `SubscriptionOrder_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotifyDeliveryLog` ADD CONSTRAINT `NotifyDeliveryLog_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotifyDeliveryLog` ADD CONSTRAINT `NotifyDeliveryLog_installationId_fkey` FOREIGN KEY (`installationId`) REFERENCES `AppInstallation`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RestoreEvent` ADD CONSTRAINT `RestoreEvent_appUserId_fkey` FOREIGN KEY (`appUserId`) REFERENCES `AppUser`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
