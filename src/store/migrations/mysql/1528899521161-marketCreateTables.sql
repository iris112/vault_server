CREATE TABLE `MarketAccounts` (
  `accountId` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `address` VARCHAR(42) NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `balance` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updatedAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  `createdAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  PRIMARY KEY (`accountId`),
  UNIQUE `address_UNIQUE` (`address`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE `MarketTransactions` (
  `marketTransactionId` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `txHash` VARCHAR(66) NOT NULL,
  `address` VARCHAR(42) NOT NULL,
  `amount` BIGINT UNSIGNED NOT NULL,
  `confirmations` INT(5) UNSIGNED NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL,
  `status` ENUM('pending', 'confirmed') NOT NULL DEFAULT 'pending',
  `amountWasLoaded` BOOL DEFAULT FALSE, # Sets to true when the amount is added to the Wallet balance
  `updatedAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  `createdAt` BIGINT(13) UNSIGNED NOT NULL, # unix timestamp in mls
  PRIMARY KEY (`marketTransactionId`),
  UNIQUE `txHash_UNIQUE` (`txHash`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
