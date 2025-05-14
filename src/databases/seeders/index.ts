import accountSeed from './account.seed'
import placeCategorySeed from './place-category.seed'

(async () => {
    await accountSeed()
    await placeCategorySeed()
})().catch(console.error)
