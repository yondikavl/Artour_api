/**
 * Convert number to IDR currency format.
 */
export const toIdrCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR'
    }).format(value)
}
