import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

const currency = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function HomeScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    products: 0,
    clients: 0,
    bills: 0,
    revenue: 0,
    lowStock: 0,
  });
  const [recentBills, setRecentBills] = useState([]);
  const [recentClients, setRecentClients] = useState([]);

  const loadDashboard = useCallback(async () => {
    const [
      productsResult,
      clientsResult,
      billsResult,
      revenueResult,
      recentBillsResult,
      recentClientsResult,
    ] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("bills").select("id", { count: "exact", head: true }),
      supabase.from("bills").select("total_amount"),
      supabase
        .from("bills")
        .select("id, client_name, client_phone, total_amount, created_at")
        .order("id", { ascending: false })
        .limit(3),
      supabase
        .from("clients")
        .select("id, name, phone, created_at")
        .order("id", { ascending: false })
        .limit(3),
    ]);

    const totalRevenue =
      revenueResult.data?.reduce(
        (sum, bill) => sum + Number(bill.total_amount || 0),
        0
      ) || 0;

    setStats({
      products: productsResult.count || 0,
      clients: clientsResult.count || 0,
      bills: billsResult.count || 0,
      revenue: totalRevenue,
      lowStock: 0,
    });
    setRecentBills(recentBillsResult.data || []);
    setRecentClients(recentClientsResult.data || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadDashboard();
      setLoading(false);
    };

    init();
  }, [loadDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const dashboardCards = [
    {
      title: "Total Products",
      value: stats.products,
      icon: "cube-outline",
      color: "#1d4ed8",
      bg: "#eff6ff",
    },
    {
      title: "Total Clients",
      value: stats.clients,
      icon: "people-outline",
      color: "#047857",
      bg: "#ecfdf5",
    },
    {
      title: "Total Bills",
      value: stats.bills,
      icon: "receipt-outline",
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      title: "Revenue",
      value: currency(stats.revenue),
      icon: "trending-up-outline",
      color: "#b45309",
      bg: "#fffbeb",
    },
    {
      title: "Low Stock Alerts",
      value: stats.lowStock,
      icon: "alert-circle-outline",
      color: "#dc2626",
      bg: "#fef2f2",
    },
  ];

  const quickActions = [
    {
      title: "New Bill",
      icon: "add-circle-outline",
      screen: "Billing",
      color: "#1d4ed8",
    },
    {
      title: "Add Product",
      icon: "cube-outline",
      screen: "Products",
      color: "#047857",
    },
    {
      title: "Add Client",
      icon: "person-add-outline",
      screen: "Clients",
      color: "#7c3aed",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.logoBox}>
            <Ionicons name="flash" size={28} color="#ffffff" />
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Dashboard</Text>
          </View>
        </View>

        <Text style={styles.title}>Electrical Billing Management</Text>
        <Text style={styles.tagline}>Smart Billing & Inventory Solution</Text>
        <Text style={styles.welcome}>
          Welcome back. Manage invoices, customers, stock, and daily sales from
          one clean workspace.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#1d4ed8" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Business Overview</Text>
            <Text style={styles.sectionHint}>Today</Text>
          </View>

          <View style={styles.cardsGrid}>
            {dashboardCards.map((card) => (
              <View key={card.title} style={styles.metricCard}>
                <View style={[styles.metricIcon, { backgroundColor: card.bg }]}>
                  <Ionicons name={card.icon} size={22} color={card.color} />
                </View>
                <Text style={styles.metricValue}>{card.value}</Text>
                <Text style={styles.metricTitle}>{card.title}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.title}
                style={styles.quickAction}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View
                  style={[
                    styles.quickIcon,
                    { backgroundColor: `${action.color}18` },
                  ]}
                >
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.quickText}>{action.title}</Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Bill History")}>
              <Text style={styles.linkText}>View Bills</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            {recentBills.length === 0 && recentClients.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Ionicons name="document-text-outline" size={26} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No activity yet</Text>
                <Text style={styles.emptyText}>
                  New bills and clients will appear here automatically.
                </Text>
              </View>
            ) : (
              <>
                {recentBills.map((bill) => (
                  <View key={`bill-${bill.id}`} style={styles.activityRow}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="receipt-outline" size={18} color="#1d4ed8" />
                    </View>
                    <View style={styles.activityBody}>
                      <Text style={styles.activityTitle}>
                        Bill for {bill.client_name || "Client"}
                      </Text>
                      <Text style={styles.activitySubtitle}>
                        {bill.client_phone || "No phone"} • {currency(bill.total_amount)}
                      </Text>
                    </View>
                  </View>
                ))}

                {recentClients.map((client) => (
                  <View key={`client-${client.id}`} style={styles.activityRow}>
                    <View style={[styles.activityIcon, styles.clientActivityIcon]}>
                      <Ionicons name="person-outline" size={18} color="#047857" />
                    </View>
                    <View style={styles.activityBody}>
                      <Text style={styles.activityTitle}>
                        New client: {client.name}
                      </Text>
                      <Text style={styles.activitySubtitle}>
                        {client.phone || "No phone"}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>

          <View style={styles.brandCard}>
            <Text style={styles.brandLabel}>Developed by</Text>
            <Text style={styles.brandName}>Sahid Khan</Text>
            <Text style={styles.brandRole}>Associate Full Stack Developer</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f4f7fb",
    flex: 1,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 28,
    marginBottom: 22,
    padding: 22,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 26,
  },
  logoBox: {
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  livePill: {
    alignItems: "center",
    backgroundColor: "#ffffff14",
    borderRadius: 999,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveDot: {
    backgroundColor: "#22c55e",
    borderRadius: 999,
    height: 8,
    marginRight: 8,
    width: 8,
  },
  liveText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 34,
  },
  tagline: {
    color: "#93c5fd",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 8,
  },
  welcome: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
  },
  loadingText: {
    color: "#64748b",
    fontWeight: "700",
    marginTop: 10,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 132,
    padding: 15,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    width: "48%",
    elevation: 3,
  },
  metricIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 42,
    justifyContent: "center",
    marginBottom: 13,
    width: 42,
  },
  metricValue: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
  },
  metricTitle: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  quickGrid: {
    gap: 10,
    marginBottom: 22,
  },
  quickAction: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    padding: 14,
  },
  quickIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 46,
    justifyContent: "center",
    marginRight: 12,
    width: 46,
  },
  quickText: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
  },
  linkText: {
    color: "#1d4ed8",
    fontWeight: "900",
  },
  activityCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 18,
    overflow: "hidden",
    padding: 6,
  },
  activityRow: {
    alignItems: "center",
    flexDirection: "row",
    padding: 12,
  },
  activityIcon: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    marginRight: 12,
    width: 42,
  },
  clientActivityIcon: {
    backgroundColor: "#ecfdf5",
  },
  activityBody: {
    flex: 1,
  },
  activityTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  activitySubtitle: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  emptyActivity: {
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
  brandCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbeafe",
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  brandLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  brandName: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4,
  },
  brandRole: {
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
});
