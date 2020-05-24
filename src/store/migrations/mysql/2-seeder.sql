INSERT INTO `Wallets` (`walletId`, `walletUid`, `userUid`, `currency`, `availableBalance`, `lockedBalance`, `updatedAt`, `createdAt`)
VALUES
    (1, '833e1098-e6ee-4f07-97b7-905add18b279', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'btc', 155000000, 0, 1524687397689, 1524684379762),
    (2, 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aa7', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'ltc', 300000000, 0, 1524686332108, 1524684386247),
    (3, 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aa8', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'eth', 0, 0, 1524686332108, 1524684386247),
    (4, 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aa9', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'nhq', 0, 0, 1524686332108, 1524684386247),
    (5, 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aaa', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'xrp', 0, 0, 1524686332108, 1524684386247),
    (6, 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aab', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'etc', 0, 0, 1524686332108, 1524684386247),
    (7, 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aac', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'neo', 0, 0, 1524686332108, 1524684386247),
    (8, 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aad', '439c9912-47a7-11e8-842f-0ed5f89f718b', 'xlm', 0, 0, 1524686332108, 1524684386247);

INSERT INTO `Addresses` (`addressId`, `walletId`, `userUid`, `currency`, `address`, `privateKey`, `updatedAt`, `createdAt`)
VALUES
    (1, 1, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'btc', '2N7ptEvNJeLyst6Xxm5q1ayWbkjJxTu1Ftm', null, 1524684380132, 1524684380132),
    (2, 2, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'ltc', 'mmingBeNqNMYz2CsoQBo4gSmXs6AeqoiUt', null, 1524684387930, 1524684387930),
    (3, 1, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'btc', '2N4vKPwBJ5epmdiBMU6xf82WpdFXw4ezgBo', null, 1524684386247, 1524684386247),
    (4, 2, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'ltc', 'mfpt9JhHtvQXXKiWVngyekocvNE45XDy6D', null, 1524684386247, 1524684386247),
    (5, 3, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'eth', '0xc6eB2f2f20e08BE95FFBbf0fACfCd5225b738E11', '0x282197277d78fbcfdb19935bc5021666e4436c491b87f6529729ff81033e6fcc', 1524684386247, 1524684386247),
    (6, 3, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'eth', '0x2b3f2AFD025006A05222812286e4c7EF0f6EA4C7', '0x9e32e55aa1076b3103387ba09850ba349253bd62dac88aad598b2ece2ee1e680', 1524684386247, 1524684386247),
    (7, 4, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'nhq', '0xc6eB2f2f20e08BE95FFBbf0fACfCd5225b738E11', '0x282197277d78fbcfdb19935bc5021666e4436c491b87f6529729ff81033e6fcc', 1524684386247, 1524684386247),
    (8, 4, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'nhq', '0x2b3f2AFD025006A05222812286e4c7EF0f6EA4C7', '0x9e32e55aa1076b3103387ba09850ba349253bd62dac88aad598b2ece2ee1e680', 1524684386247, 1524684386247),
    (9, 5, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'xrp', 'rLq2NPpTPw24b1TxSBqgJwBbj1DDr5zBbR', 'ss9Yrjr3Ezq6EJuPuoycGMRMUXkQm', 1524684386247, 1524684386247),
    (10, 5, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'xrp', 'rpaYDdaPDY3mPFaHfDsoFqGgfopot7XLmq', 'sarEVtDtfx2dW6rvk5iByMQ7GAQLQ', 1524684386247, 1524684386247),
    (11, 6, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'etc', '0x0C7C81175C79fEa43dE333b99b6Ccd9Ebb5730e2', '0xb3f96bf5197d7a3e0ee5bf94b66f36cd2ea1b9989de234116ee2102f99dce81d', 1524684386247, 1524684386247),
    (12, 6, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'etc', '0x237f3462CC24dFfDe246B510460C55FB58669137', '0x7d102d9b076ada137601ecac60df3b28555b1525544f4e28d1619622bd6b96dd', 1524684386247, 1524684386247),
    (13, 7, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'neo', 'AHkeCdfk6ATs2ru4gKFZJtmoxN587dRHk9', null, 1524684386247, 1524684386247),
    (14, 7, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'neo', 'AXwaXLoqvfGyWFmpRKgBHWkocb29BceZY1', null, 1524684386247, 1524684386247),
    (15, 8, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'xlm', 'GCMMF6LFXCQMVNQQMK3MCRVV4SY76EBMCC7JVDQXMUXGWTM3C3P5XLGX', 'SCDYDGTXV54NJ5JNHD2KXO4MQR3FWCB2MOEFZXBQBEZZ2TLB7PQDBTEO', 1524684386247, 1524684386247),
    (16, 8, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'xlm', 'GBKVET3BXEBMK5XX6ME4C5I7L44AJVCIJ6FVGA3HIEVME6W34FCMM5AZ', 'SCG6YHGQLLGDVQDWIZFYN52VEPA5J6MN5GOWDAKBGJAC5V62XBUW5CU5', 1524684386247, 1524684386247),
    (17, 8, '439c9912-47a7-11e8-842f-0ed5f89f718b', 'xlm', 'GD6OJZRD6N7WEKD3V5DZMTS27SHZXZGIFRSD4UMGB4VBYUEJQPEE3UAA', 'SA6S4UVOM6JDF3U5ZP3Y4IYEHJCUSDVYTBMQTOZFPQJ3IIJEIR4MESIA', 1524684386247, 1524684386247);