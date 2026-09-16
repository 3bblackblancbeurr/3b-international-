from pathlib import Path

p = Path('tests/shop.test.js')
s = p.read_text()

replacements = [
("""    prices: { retrieve: async id => prices[id] },""", """    prices: {
      retrieve: async id => prices[id],
      list: async ({ product, active, type }) => ({
        data: Object.values(prices)
          .filter(price => price.product?.id === product && (!active || price.active) && (!type || price.type === type))
          .map(price => ({ ...price, product })),
        has_more: false,
      }),
    },"""),
("""  for (const mutate of [p => p.active = false, p => p.default_price.active = false,
    p => p.default_price.type = \"recurring\", p => p.default_price.tax_behavior = \"exclusive\",
    p => p.default_price.currency = \"usd\", p => p.default_price = null,
    p => p.metadata.shop_visible = \"TRUE\"]) {
    const invalid = dashboardFixture(); mutate(invalid.products.prod_M);
    assert.equal((await invalid.shop.checkout(checkoutRequest())).status, 409);
    assert.equal(invalid.calls.creates.length, 0);
  }""", """  for (const mutate of [f => f.products.prod_M.active = false, f => f.prices.price_M.active = false,
    f => f.prices.price_M.type = \"recurring\", f => f.prices.price_M.tax_behavior = \"exclusive\",
    f => f.prices.price_M.currency = \"usd\", f => f.products.prod_M.metadata.shop_visible = \"TRUE\"]) {
    const invalid = dashboardFixture(); mutate(invalid);
    assert.equal((await invalid.shop.checkout(checkoutRequest())).status, 409);
    assert.equal(invalid.calls.creates.length, 0);
  }"""),
("""  product.default_price.product = product.id; product.default_price.unit_amount = 12500;
  f.products.prod_New = product;""", """  product.default_price.product = product.id; product.default_price.unit_amount = 12500;
  f.products.prod_New = product;
  f.prices.price_New = { ...product.default_price, product };"""),
("""test(\"unpublishing a product or replacing its default price rejects the previously displayed price\", async () => {
  for (const mutate of [p => p.metadata.shop_visible = \"false\", p => p.default_price.id = \"price_Replacement\"]) {
    const f = dashboardFixture(); await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`));
    mutate(f.products.prod_M);
    assert.equal((await f.shop.checkout(checkoutRequest())).status, 409);
    assert.equal(f.calls.creates.length, 0);
  }
});""", """test(\"unpublishing a product or deactivating its price rejects the previously displayed price\", async () => {
  for (const mutate of [f => f.products.prod_M.metadata.shop_visible = \"false\", f => f.prices.price_M.active = false]) {
    const f = dashboardFixture(); await f.shop.catalog(new Request(`${ORIGIN}/api/catalog`));
    mutate(f);
    assert.equal((await f.shop.checkout(checkoutRequest())).status, 409);
    assert.equal(f.calls.creates.length, 0);
  }
});"""),
("""  assert.deepEqual(calls[0].expand, [\"data.default_price\"]);""", """  assert.equal(calls[0].expand, undefined);"""),
]

changed = False
for old, new in replacements:
    if old in s:
        s = s.replace(old, new, 1)
        changed = True
    elif new not in s:
        raise SystemExit('Expected legacy test block was not found')

if changed:
    p.write_text(s)
