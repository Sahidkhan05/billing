import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

const stockValue = (item) => Number(item.total_stock ?? item.total_unit ?? 0);
const unitType = (item) => item.unit || item.unit_type || "Unit";

const stockStatus = (totalStock, remainingStock) => {
  const lowStockPoint = Math.max(2, totalStock * 0.2);
  return remainingStock <= lowStockPoint ? "low" : "good";
};

export default function StockScreen() {
  const [products, setProducts] = useState([]);
  const [usedByProduct, setUsedByProduct] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    setLoading(true);

    const [productsResult, itemsResult] = await Promise.all([
      supabase.from("products").select("*").order("id", { ascending: false }),
      supabase.from("bill_items").select("product_id, quantity"),
    ]);

    if (productsResult.error) {
      console.log(productsResult.error);
      setProducts([]);
    } else {
      setProducts(productsResult.data || []);
    }

    if (itemsResult.error) {
      console.log(itemsResult.error);
      setUsedByProduct({});
    } else {
      const totals = (itemsResult.data || []).reduce((summary, item) => {
        const key = item.product_id;
        summary[key] = (summary[key] || 0) + Number(item.quantity || 0);
        return summary;
      }, {});

      setUsedByProduct(totals);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStockData();
    setRefreshing(false);
  };

  const stockRows = useMemo(
    () =>
      products.map((product) => {
        const totalStock = stockValue(product);
        const usedStock = Number(usedByProduct[product.id] || 0);
        const remainingStock = Math.max(totalStock - usedStock, 0);
        const status = stockStatus(totalStock, remainingStock);
        const progress =
          totalStock > 0 ? Math.min(100, (remainingStock / totalStock) * 100) : 0;

        return {
          ...product,
          totalStock,
          usedStock,
          remainingStock,
          status,
          progress,
        };
      }),
    [products, usedByProduct]
  );

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return stockRows;
    }

    return stockRows.filter((item) => {
      const name = String(item.product_name || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const unit = String(unitType(item)).toLowerCase();

      return (
        name.includes(keyword) ||
        category.includes(keyword) ||
        unit.includes(keyword)
      );
    });
  }, [search, stockRows]);

  const summary = useMemo(
    () =>
      stockRows.reduce(
        (totals, item) => ({
          total: totals.total + item.totalStock,
          used: totals.used + item.usedStock,
          remaining: totals.remaining + item.remainingStock,
          low: totals.low + (item.status === "low" ? 1 : 0),
        }),
        { total: 0, used: 0, remaining: 0, low: 0 }
      ),
    [stockRows]
  );

  const renderStockCard = ({ item }) => {
    const isLow = item.status === "low";
    const color = isLow ? "#dc2626" : "#16a34a";
    const background = isLow ? "#fef2f2" : "#ecfdf5";
    const border = isLow ? "#fecaca" : "#bbf7d0";

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBox, { backgroundColor: background }]}>
            <Ionicons name="cube-outline" size={22} color={color} />
          </View>

          <View style={styles.body}>
            <Text style={styles.productName}>{item.product_name}</Text>
            <Text style={styles.meta}>
              {item.category || "General"} • {unitType(item)}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: background, borderColor: border }]}>
            <Text style={[styles.statusText, { color }]}>
              {isLow ? "Low Stock" : "Good Stock"}
            </Text>
          </View>
        </View>

        <View style={styles.stockGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total Stock</Text>
            <Text style={styles.metricValue}>
              {item.totalStock} {unitType(item)}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Used Stock</Text>
            <Text style={styles.metricValue}>
              {item.usedStock} {unitType(item)}
            </Text>
          </View>
        </View>

        <View style={styles.remainingRow}>
          <View>
            <Text style={styles.metricLabel}>Remaining Stock</Text>
            <Text style={[styles.remainingValue, { color }]}>
              {item.remainingStock} {unitType(item)}
            </Text>
          </View>
          <Text style={styles.percentText}>{Math.round(item.progress)}%</Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: color, width: `${item.progress}%` },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredRows}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStockCard}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="analytics-outline" size={28} color="#ffffff" />
              </View>
              <Text style={styles.eyebrow}>Inventory Control</Text>
              <Text style={styles.heading}>Stock</Text>
              <Text style={styles.subtitle}>
                Monitor total, used, and remaining product stock from billing
                activity.
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>{summary.total}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Used</Text>
                <Text style={styles.summaryValue}>{summary.used}</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Low</Text>
                <Text style={[styles.summaryValue, styles.lowValue]}>
                  {summary.low}
                </Text>
              </View>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color="#64748b" />
                <TextInput
                  placeholder="Search product, category, or unit type"
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.resultsRow}>
                <Text style={styles.resultsText}>
                  {filteredRows.length} products shown
                </Text>
                <Text style={styles.resultsText}>
                  {summary.remaining} remaining units
                </Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color="#1d4ed8" />
              <Text style={styles.emptyTitle}>Loading stock...</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="layers-outline" size={34} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No stock available</Text>
              <Text style={styles.emptyText}>
                Add products with total stock to start tracking inventory.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f4f7fb",
    flex: 1,
  },
  listContent: {
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 26,
    marginBottom: 14,
    padding: 20,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#0f766e",
    borderRadius: 17,
    height: 52,
    justifyContent: "center",
    marginBottom: 16,
    width: 52,
  },
  eyebrow: {
    color: "#99f6e4",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heading: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  summaryBox: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  summaryValue: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6,
  },
  lowValue: {
    color: "#dc2626",
  },
  searchCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  searchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  resultsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  resultsText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  iconBox: {
    alignItems: "center",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    marginRight: 12,
    width: 48,
  },
  body: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  meta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "900",
  },
  stockGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  metricBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 5,
  },
  remainingRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  remainingValue: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  percentText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "900",
  },
  progressTrack: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    height: 9,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 999,
    height: "100%",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 28,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 5,
    textAlign: "center",
  },
});
