-- Add 'encomenda' to the product_category enum so custom orders can be stored
alter type product_category add value if not exists 'encomenda';
