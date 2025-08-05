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
 * Функция для сбора промежуточных данных для сбора статистики
 * @param {object} data исходные тестовые данные
 * @returns {array}
 */
const initialData = (data) =>
    data.sellers.map((seller) => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,

        products_sold: {},
    }));

/**
 * Функция для формирование объекта, чтоб вывести его на экран
 * @param {object} data исходные тестовые данные
 * @returns {array}
 */
const printDataSeller = (sellerStats) =>
    sellerStats.map((seller) => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: +seller.sales_count.toFixed(2),
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));

const dataIndex = (data, index) => Object.fromEntries(data.map((item) => [item[index], item]));

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

/**
 * Сформирование и обновление поля с числом
 * @param {number} field запись, которую нужно сформировать или обновить
 * @param {number} value на сколько увеличить число
 * @returns {number}
 */
function updateFieldValue(field, value = 1) {
    if (!field) field = 0;
    field += value;

    return field;
}

/**
 * Реализация сортировки с помощью паттерна стратегии
 * @param {string} order метод сортировки. asc - по возрастанию, desc - по убыванию
 * @param {string} key ключ для объекта, если необходим
 */
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

/**
 * Сортировка записей
 * @param {array} arr исходный массив
 * @param {string} order метод сортировки. asc - по возрастанию, desc - по убыванию
 * @param {string} key ключ для объекта, если необходим
 * @returns {array}
 */
function sorting({ arr, order, key }) {
    arr.sort((a, b) => sortHelper({ a, b, order, key }));
}

/**
 * Сортировка записей по прибыли
 * @param {array} arr исходный массив
 * @returns {array}
 */
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
 * @param {number} product продукт
 * @param {cb} вариант просчета выручки
 * @returns {number}
 */
function calculateProfit(purchase, product, cb) {
    const { purchase_price } = product;
    const { quantity } = purchase;

    const cost = purchase_price * quantity;
    const revenue = cb(purchase);

    return revenue - cost;
}

/**
 * Функция для расчета бонусов
 * @param {number} index порядковый номер в отсортированном массиве
 * @param {number} total общее число продавцов
 * @param {object} seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;
    const ranks = {
        first: { condition: index === 0, bonus: profit * 0.15 },
        second: { condition: index === 1 || index === 2, bonus: profit * 0.1 },
        last: { condition: index === total - 1, bonus: 0 },
        other: { condition: true, bonus: profit * 0.05 },
    };

    for (const rank of Object.values(ranks)) {
        if (rank.condition) return rank.bonus;
    }
}

/**
 * Функция для сформирования списка топа 10
 * @param seller карточка продавца
 * @returns {array}
 */
function getSellerTopProducts(seller) {
    const arrayProducts = Object.entries(seller.products_sold).map(([sku, quantity]) => ({
        sku,
        quantity,
    }));
    sorting({ arr: arrayProducts, order: 'desc', key: 'quantity' });

    return arrayProducts.slice(0, 10);
}

/**
 * Сформирования бонуса по рангу
 * @param {array} sellers - продавцы
 * @param {Function} cb - метод формирования бонуса
 * @returns {void}
 */
function bonusSellerByRank(sellers, cb) {
    sellers.forEach((seller, index) => {
        seller.bonus = cb(index, sellers.length, seller);
        seller.top_products = getSellerTopProducts(seller);
    });
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

    const sellerStats = initialData(data);

    const sellerIndex = dataIndex(sellerStats, 'id');
    const productIndex = dataIndex(data.products, 'sku');

    // @TODO: Расчет выручки и прибыли для каждого продавца
    data.purchase_records.forEach((record) => {
        const seller = sellerIndex[record.seller_id];

        seller.sales_count = updateFieldValue(seller.sales_count);
        seller.revenue = updateFieldValue(seller.revenue, record.total_amount);

        record.items.forEach((item) => {
            const product = productIndex[item.sku];
            const profit = calculateProfit(item, product, calculateRevenue);

            seller.profit = updateFieldValue(seller.profit, profit);
            seller.products_sold[item.sku] = updateFieldValue(seller.products_sold[item.sku], item.quantity);
        });
    });

    sortByProfit(sellerStats);
    bonusSellerByRank(sellerStats, calculateBonus);

    return printDataSeller(sellerStats);
}
