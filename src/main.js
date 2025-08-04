/**
 * Функция для проверки корректный процент или нет
 * @param {number} percent число для проверки
 * @returns {number}
 */
const isValidPercent = (percent) => percent >= 0 && percent <= 100;

/**
 * Функция для проверки, что число не отрицательное
 * @param {number} num число для проверки
 * @returns {number}
 */
const isNotNegative = (num) => num >= 0;

/**
 * Функция для вычисление суммы без скидки
 * @param {number} discount скидка
 * @returns {number}
 */
function calculateSubtotal(discount) {
    if (!isValidPercent(discount))
        throw new Error(`Неверное значение в переменной discount: ${discount}. Должно быть число от 0 до 100`);

    return 1 - discount / 100;
}

/**
 * Функция для проверки корректных данных в объекте purchase
 * @param {object} purchase запись о покупке
 * @returns {void}
 */
function validatePurchase(purchase) {
    const { discount, sale_price, quantity } = purchase;

    if (!isValidPercent(discount))
        throw new Error(`Неверное значение в переменной discount: ${discount}. Должно быть число от 0 до 100`);

    if (!isNotNegative(sale_price))
        throw new Error(`Неверное значение в переменной sale_price: ${sale_price}. Должно быть число >= 0`);

    if (!isNotNegative(quantity))
        throw new Error(`Неверное значение в переменной quantity: ${quantity}. Должно быть число >= 0`);
}

function sortHelper({ a, b, order, key }) {
    const isObject = typeof a === 'object' && typeof b === 'object';
    const valueA = isObject ? a[key] : a;
    const valueB = isObject ? b[key] : b;

    orders = {
        asc: valueA - valueB,
        desc: valueB - valueA,
    };

    return orders[order];
}

function sorting({ arr, order, key }) {
    arr.sort((a, b) => sortHelper({ a, b, order, key }));
}

function toSorting({ arr, order, key }) {
    return arr.toSorted((a, b) => sortHelper({ a, b, order, key }));
}

function sortByProfit(arr) {
    return sorting({ arr, order: 'desc', key: 'profit' });
}

/**
 * Функция для расчета выручки
 * @param {object} purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // @TODO: Расчет выручки от операции
    const { discount, sale_price, quantity } = purchase;

    validatePurchase(purchase);

    const subtotal = calculateSubtotal(discount);
    const revenue = sale_price * subtotal * quantity;

    return revenue;
}

/**
 * Функция для расчета выручки
 * @param {object} purchase запись о покупке
 * @param {number} product
 * @returns {number}
 */
function calculateSimpleProfit(purchase, product) {
    const { purchase_price } = product;
    const { quantity } = purchase;

    const cost = purchase_price * quantity;
    const revenue = calculateSimpleRevenue(purchase);

    return revenue - cost;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.1;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

function getSellerTopProducts(seller) {
    const arrayProducts = Object.entries(seller.products_sold).map(([sku, quantity]) => ({
        sku,
        quantity,
    }));
    const sortedArrayProducts = toSorting({ arr: arrayProducts, order: 'desc', key: 'quantity' });

    return sortedArrayProducts.slice(0, 10);
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param {object} options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data || !Array.isArray(data.sellers) || data.sellers.length === 0 || typeof options !== 'object')
        throw new Error('Некорректные входные данные');

    const { calculateRevenue, calculateBonus } = options;

    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function')
        throw new Error('Опции не являются функции');

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,

        products_sold: {},
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = Object.fromEntries(sellerStats.map((item) => [item.id, item]));
    const productIndex = Object.fromEntries(data.products.map((item) => [item.sku, item]));

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach((record) => {
        const seller = sellerIndex[record.seller_id];

        if (!seller.sales_count) seller.sales_count = 0;
        seller.sales_count += 1;

        if (!seller.revenue) seller.revenue = 0;
        seller.revenue += record.total_amount;

        record.items.forEach((item) => {
            const product = productIndex[item.sku];
            const profit = calculateSimpleProfit(item, product);

            if (!seller.profit) seller.profit = 0;
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }

            seller.products_sold[item.sku] += 1;
        });
    });

    // @TODO: Сортировка продавцов по прибыли
    sortByProfit(sellerStats);

    // @TODO: Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        seller.top_products = getSellerTopProducts(seller);
    });

    return sellerStats.map((seller) => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: seller.revenue,
        profit: seller.profit,
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: seller.bonus,
    }));
}
