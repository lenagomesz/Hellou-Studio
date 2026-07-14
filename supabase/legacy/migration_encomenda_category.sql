-- LEGADO: adiciona 'encomenda' ao enum product_category.
alter type product_category add value if not exists 'encomenda';
