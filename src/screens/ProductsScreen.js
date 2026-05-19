import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";

const units = ["Piece", "Box", "Roll", "Meter", "Packet"];

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
const stockValue = (item) => Number(item.total_unit ?? 0);

export default function ProductsScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [totalStock, setTotalStock] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setProducts(data || []);
  };

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return products;
    }

    return products.filter(
      (item) =>
        item.product_name?.toLowerCase().includes(keyword) ||
        item.category?.toLowerCase().includes(keyword) ||
        item.unit?.toLowerCase().includes(keyword)
    );
  }, [products, search]);

  const handleSaveProduct = async () => {
    if (
      !productName ||
      !purchasePrice ||
      !sellingPrice ||
      !totalStock ||
      !category ||
      !unit
    ) {
      Alert.alert("Missing Details", "Please fill all required product fields.");
      return;
    }

    const numericStock = Number(totalStock);

    if (Number.isNaN(numericStock) || numericStock < 0) {
      Alert.alert("Invalid Stock", "Please enter a valid total stock value.");
      return;
    }

    const productData = {
      product_name: productName,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      total_unit: numericStock,
      category,
      description,
      unit,
    };

    const savePayload = editId ? productData : { ...productData, used_stock: 0 };
    const saveResult = editId
      ? await supabase.from("products").update(savePayload).eq("id", editId)
      : await supabase.from("products").insert([savePayload]);

    if (saveResult.error) {
      console.log(saveResult.error);
      Alert.alert("Save Failed", "Unable to save product details.");
      return;
    }

    fetchProducts();
    resetForm();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.log(error);
      return;
    }

    fetchProducts();
  };

  const confirmDelete = (id) => {
    Alert.alert("Delete Product", "Are you sure you want to delete this product?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(id),
      },
    ]);
  };

  const handleEdit = (item) => {
    setProductName(item.product_name || "");
    setPurchasePrice(String(item.purchase_price || ""));
    setSellingPrice(String(item.selling_price || ""));
    setTotalStock(String(stockValue(item)));
    setCategory(item.category || "");
    setDescription(item.description || "");
    setUnit(item.unit || "");
    setEditId(item.id);
    setModalVisible(true);
  };

  const resetForm = () => {
    setProductName("");
    setPurchasePrice("");
    setSellingPrice("");
    setTotalStock("");
    setCategory("");
    setDescription("");
    setUnit("");
    setEditId(null);
    setModalVisible(false);
  };

  const openAddProduct = () => {
    resetForm();
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="cube-outline" size={28} color="#ffffff" />
              </View>

              <Text style={styles.eyebrow}>Inventory Management</Text>
              <Text style={styles.heading}>Products</Text>
              <Text style={styles.subtitle}>
                Manage electrical items, pricing, categories, and units from one
                organized workspace.
              </Text>

              <TouchableOpacity style={styles.addButton} onPress={openAddProduct}>
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.addButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color="#64748b" />
                <TextInput
                  placeholder="Search product, category, or unit"
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

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {filteredProducts.length} products found
                </Text>
                <Text style={styles.summaryText}>{products.length} total</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={34} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No products found</Text>
            <Text style={styles.emptyText}>
              Add products or adjust your search to see inventory items here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.productIcon}>
                <Ionicons name="cube" size={22} color="#1d4ed8" />
              </View>

              <View style={styles.productBody}>
                <Text style={styles.productName}>{item.product_name}</Text>
                <Text style={styles.productMeta}>
                  {item.category} • {item.unit}
                </Text>
              </View>
            </View>

            <View style={styles.priceGrid}>
              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Purchase</Text>
                <Text style={styles.priceValue}>{money(item.purchase_price)}</Text>
              </View>

              <View style={styles.priceBox}>
                <Text style={styles.priceLabel}>Selling</Text>
                <Text style={styles.priceValue}>{money(item.selling_price)}</Text>
              </View>
            </View>

            <View style={styles.stockPanel}>
              <View>
                <Text style={styles.priceLabel}>Total Stock</Text>
                <Text style={styles.stockValue}>
                  {stockValue(item)} {item.unit || "Unit"}
                </Text>
              </View>
              <Ionicons name="layers-outline" size={20} color="#0f766e" />
            </View>

            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : null}

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create-outline" size={16} color="#075985" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>
                {editId ? "Update Inventory" : "New Inventory Item"}
              </Text>
              <Text style={styles.modalHeading}>
                {editId ? "Edit Product" : "Add Product"}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={resetForm}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Product Name</Text>
            <TextInput
              placeholder="Enter product name"
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
            />

            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <Text style={styles.label}>Purchase Price</Text>
                <TextInput
                  placeholder="0"
                  style={styles.input}
                  keyboardType="numeric"
                  value={purchasePrice}
                  onChangeText={setPurchasePrice}
                />
              </View>

              <View style={styles.formColumn}>
                <Text style={styles.label}>Selling Price</Text>
                <TextInput
                  placeholder="0"
                  style={styles.input}
                  keyboardType="numeric"
                  value={sellingPrice}
                  onChangeText={setSellingPrice}
                />
              </View>
            </View>

            <Text style={styles.label}>Total Unit</Text>
            <TextInput
              placeholder="Enter total stock"
              style={styles.input}
              keyboardType="numeric"
              value={totalStock}
              onChangeText={setTotalStock}
            />

            <Text style={styles.label}>Category</Text>
            <TextInput
              placeholder="Switches, Wire, Lighting..."
              style={styles.input}
              value={category}
              onChangeText={setCategory}
            />

            <Text style={styles.label}>Unit Type</Text>
            <View style={styles.unitContainer}>
              {units.map((item) => {
                const active = unit === item;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.unitButton, active && styles.activeUnitButton]}
                    onPress={() => setUnit(item)}
                  >
                    <Text style={[styles.unitText, active && styles.activeUnitText]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              placeholder="Optional product notes"
              style={[styles.input, styles.descriptionInput]}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProduct}>
              <Text style={styles.saveButtonText}>
                {editId ? "Update Product" : "Save Product"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
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
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 17,
    height: 52,
    justifyContent: "center",
    marginBottom: 16,
    width: 52,
  },
  eyebrow: {
    color: "#93c5fd",
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
  addButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#1d4ed8",
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
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
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  summaryText: {
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
  productIcon: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    marginRight: 12,
    width: 48,
  },
  productBody: {
    flex: 1,
  },
  productName: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  productMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  priceGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  priceBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    flex: 1,
    padding: 12,
  },
  priceLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  priceValue: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  stockPanel: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderColor: "#ccfbf1",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    padding: 12,
  },
  stockValue: {
    color: "#0f766e",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 4,
  },
  description: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 12,
  },
  actionContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  editText: {
    color: "#075985",
    fontWeight: "900",
  },
  deleteText: {
    color: "#b91c1c",
    fontWeight: "900",
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
  modalContainer: {
    backgroundColor: "#f4f7fb",
    flex: 1,
  },
  modalHeader: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
    paddingTop: 54,
  },
  modalEyebrow: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modalHeading: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 18,
    paddingBottom: 34,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 15,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 15,
    marginBottom: 14,
    padding: 14,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formColumn: {
    flex: 1,
  },
  descriptionInput: {
    minHeight: 108,
    textAlignVertical: "top",
  },
  unitContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 14,
  },
  unitButton: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeUnitButton: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  unitText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "900",
  },
  activeUnitText: {
    color: "#ffffff",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 15,
    marginTop: 4,
    padding: 15,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  cancelButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
});
