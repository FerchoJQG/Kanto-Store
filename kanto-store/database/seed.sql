USE kanto_store;

INSERT INTO card_sets (name, code, release_year) VALUES
('Base Set', 'base1', 1999),
('Jungle', 'base2', 1999),
('Fossil', 'base3', 1999),
('Escarlata y Púrpura', 'sv1', 2023),
('Evoluciones en Paldea', 'sv2', 2023),
('151', 'sv3pt5', 2023);

INSERT INTO products (sku, type, name, set_id, card_number, rarity, language, cond, sealed_kind, image_url, price, stock, min_stock) VALUES
('BS-004-EN-NM', 'single', 'Charizard', 1, '4/102', 'Rara', 'Inglés', 'Near Mint', NULL, 'https://images.pokemontcg.io/base1/4.png', 3500.00, 1, 1),
('BS-002-EN-NM', 'single', 'Blastoise', 1, '2/102', 'Rara', 'Inglés', 'Near Mint', NULL, 'https://images.pokemontcg.io/base1/2.png', 900.00, 2, 1),
('BS-015-EN-EX', 'single', 'Venusaur', 1, '15/102', 'Rara', 'Inglés', 'Excellent', NULL, 'https://images.pokemontcg.io/base1/15.png', 800.00, 2, 1),
('BS-058-EN-MT', 'single', 'Pikachu', 1, '58/102', 'Común', 'Inglés', 'Mint', NULL, 'https://images.pokemontcg.io/base1/58.png', 120.00, 10, 3),
('BS-044-EN-PL', 'single', 'Bulbasaur', 1, '44/102', 'Común', 'Inglés', 'Played', NULL, 'https://images.pokemontcg.io/base1/44.png', 30.00, 8, 3),
('JU-001-EN-NM', 'single', 'Clefable', 2, '1/64', 'Rara', 'Inglés', 'Near Mint', NULL, 'https://images.pokemontcg.io/base2/1.png', 150.00, 3, 1),
('FO-001-EN-NM', 'single', 'Aerodactyl', 3, '1/62', 'Rara', 'Inglés', 'Near Mint', NULL, 'https://images.pokemontcg.io/base3/1.png', 200.00, 2, 1),
('SV1-081-ES-MT', 'single', 'Sprigatito', 4, '13/198', 'Común', 'Español', 'Mint', NULL, NULL, 15.00, 20, 5),
('SV1-ULT-ES-NM', 'single', 'Miraidon ex', 4, '81/198', 'Ultra rara', 'Español', 'Near Mint', NULL, NULL, 180.00, 3, 1),
('SV2-SEC-EN-MT', 'single', 'Iono (Full Art)', 5, '269/193', 'Secreta', 'Inglés', 'Mint', NULL, NULL, 450.00, 1, 1),
('151-006-EN-NM', 'single', 'Charizard ex', 6, '6/165', 'Ultra rara', 'Inglés', 'Near Mint', NULL, NULL, 300.00, 4, 1),
('151-025-ES-MT', 'single', 'Pikachu', 6, '25/165', 'Común', 'Español', 'Mint', NULL, NULL, 20.00, 15, 5),
('SEL-SV1-SOB', 'sellado', 'Sobre Escarlata y Púrpura', 4, NULL, NULL, 'Español', NULL, 'sobre', NULL, 35.00, 40, 10),
('SEL-151-SOB', 'sellado', 'Sobre 151', 6, NULL, NULL, 'Inglés', NULL, 'sobre', NULL, 45.00, 30, 10),
('SEL-SV2-CAJ', 'sellado', 'Caja de entrenador élite - Evoluciones en Paldea', 5, NULL, NULL, 'Inglés', NULL, 'caja', NULL, 650.00, 5, 2),
('SEL-151-MAZ', 'sellado', 'Mazo temático Charizard', 6, NULL, NULL, 'Español', NULL, 'mazo', NULL, 180.00, 6, 2);
