# Support UUID length for currency, ccgames needs it
ALTER TABLE `Wallets` MODIFY `currency` VARCHAR(36) NOT NULL;
ALTER TABLE `Addresses` MODIFY `currency` VARCHAR(36) NOT NULL;
ALTER TABLE `Payments` MODIFY `currency` VARCHAR(36) NOT NULL;
ALTER TABLE `Deposits` MODIFY `currency` VARCHAR(36) NOT NULL;
ALTER TABLE `MarketAccounts` MODIFY `currency` VARCHAR(36) NOT NULL;
