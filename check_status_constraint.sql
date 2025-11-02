-- statusカラムの制約を確認
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM
    pg_constraint
WHERE
    conrelid = 'trend_products'::regclass
    AND conname LIKE '%status%';

-- trend_productsテーブルの定義を確認
\d trend_products

