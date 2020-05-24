CREATE TABLE `Deposits` (
  `depositId` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `metaUid` VARCHAR(64) NOT NULL,
  `userUid` VARCHAR(36) NULL,
  `txHash` VARCHAR(100) NOT NULL, # Verify length for different currencies
  `txBlock` BIGINT UNSIGNED NULL,
  `currency` VARCHAR(4) NOT NULL,
  `address` VARCHAR(150) NOT NULL, # Verify length for different currencies
  `amount` BIGINT UNSIGNED NOT NULL,
  `confirmations` INT(5) UNSIGNED NOT NULL DEFAULT 0,
  `amountWasLoaded` BOOL DEFAULT FALSE, # Sets to true when the amount is added to the Wallet balance
  `status` ENUM('pending', 'confirmed') NOT NULL DEFAULT 'pending',
  `updatedAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  `createdAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  PRIMARY KEY (`depositId`),
  UNIQUE `metaUid_UNIQUE` (`metaUid`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE `Payments` (
  `paymentId` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `paymentUid` VARCHAR(36) NOT NULL,
  `userUid` VARCHAR(36) NOT NULL,
  `binanceId` VARCHAR(32) NULL,
  `currency` VARCHAR(4) NOT NULL,
  `address` VARCHAR(150) NOT NULL, # Verify length for different currencies
  `amount` BIGINT UNSIGNED NOT NULL,
  `fee` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `txHash` VARCHAR(100) NULL, # Verify length for different currencies
  `status` ENUM('pending', 'paid', 'canceled') NOT NULL DEFAULT 'pending',
  `updatedAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  `createdAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  PRIMARY KEY (`paymentId`),
  UNIQUE KEY `paymentUid_UNIQUE` (`paymentUid`),
  UNIQUE KEY `binanceId_UNIQUE` (`binanceId`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE `Wallets` (
  `walletId` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `walletUid` VARCHAR(36) NOT NULL,
  `userUid` VARCHAR(36) NOT NULL,
  `currency` VARCHAR(4) NOT NULL,
  `availableBalance` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `lockedBalance` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updatedAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  `createdAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  PRIMARY KEY (`walletId`),
  UNIQUE KEY `walletUid_UNIQUE` (`walletUid`),
  KEY `userUid_currency_UNIQ` (`userUid`,`currency`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

# Wallet address (public key)
CREATE TABLE `Addresses` (
  `addressId` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `walletId` INT(10) UNSIGNED NOT NULL,
  `userUid` VARCHAR(36) NOT NULL,
  `currency` VARCHAR(4) NOT NULL,
  `address` VARCHAR(150) NOT NULL, # Verify length for different currencies
  `privateKey` VARCHAR(100) NULL, # Verify length for different currencies
  `updatedAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  `createdAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  PRIMARY KEY (`addressId`),
  UNIQUE KEY `address_currency_unique` (`address`,`currency`),
  INDEX `fk_address_wallet_idx` (`walletId` ASC),
  CONSTRAINT `fk_address_wallet`
    FOREIGN KEY (`walletId`)
    REFERENCES `Wallets` (`walletId`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
