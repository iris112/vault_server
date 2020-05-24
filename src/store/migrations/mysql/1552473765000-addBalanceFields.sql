ALTER TABLE `Payments`
ADD COLUMN `balanceCurrency`  varchar(4) NULL AFTER `fee`,
ADD COLUMN `lockedBalance`  decimal(36,18) NULL AFTER `fee`,
ADD COLUMN `availableBalance`  decimal(36,18) NULL AFTER `fee`;

ALTER TABLE `Deposits`
ADD COLUMN `balanceCurrency`  varchar(4) NULL AFTER `amount`,
ADD COLUMN `lockedBalance`  decimal(36,18) NULL AFTER `amount`,
ADD COLUMN `availableBalance`  decimal(36,18) NULL AFTER `amount`;

