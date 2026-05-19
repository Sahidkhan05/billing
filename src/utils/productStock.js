import { supabase } from "../lib/supabase";

const aggregateQuantities = (items) =>
  items.reduce((totals, item) => {
    const productId = item.product_id;
    const quantity = Number(item.quantity || 0);

    if (!productId || quantity <= 0) {
      return totals;
    }

    totals[productId] = (totals[productId] || 0) + quantity;
    return totals;
  }, {});

export const updateProductsUsedStock = async (items, direction = 1) => {
  const quantityByProduct = aggregateQuantities(items);
  const productIds = Object.keys(quantityByProduct);

  if (productIds.length === 0) {
    return;
  }

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, used_stock")
    .in("id", productIds);

  if (productsError) {
    throw productsError;
  }

  const updates = (products || []).map((product) => {
    const currentUsedStock = Number(product.used_stock || 0);
    const quantityChange = quantityByProduct[product.id] * direction;
    const nextUsedStock = Math.max(currentUsedStock + quantityChange, 0);

    return supabase
      .from("products")
      .update({ used_stock: nextUsedStock })
      .eq("id", product.id);
  });

  const results = await Promise.all(updates);
  const updateError = results.find((result) => result.error)?.error;

  if (updateError) {
    throw updateError;
  }
};
