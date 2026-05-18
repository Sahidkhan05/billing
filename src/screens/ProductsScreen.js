import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function ProductsScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const [productName, setProductName] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("");

  const [products, setProducts] = useState([]);

  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  // FETCH PRODUCTS
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setProducts(data);
  };

  // SAVE PRODUCT
  const handleSaveProduct = async () => {
    if (
      !productName ||
      !purchasePrice ||
      !sellingPrice ||
      !category ||
      !unit
    ) {
      return;
    }

    const productData = {
      product_name: productName,
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      category: category,
      description: description,
      unit: unit,
    };

    // UPDATE
    if (editId) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editId);

      if (error) {
        console.log(error);
        return;
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from("products")
        .insert([productData]);

      if (error) {
        console.log(error);
        return;
      }
    }

    fetchProducts();
    resetForm();
  };

  // DELETE PRODUCT
  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      return;
    }

    fetchProducts();
  };

  // EDIT PRODUCT
  const handleEdit = (item) => {
    setProductName(item.product_name);
    setPurchasePrice(
      item.purchase_price.toString()
    );
    setSellingPrice(
      item.selling_price.toString()
    );
    setCategory(item.category);
    setDescription(item.description);
    setUnit(item.unit);

    setEditId(item.id);

    setModalVisible(true);
  };

  // RESET FORM
  const resetForm = () => {
    setProductName("");
    setPurchasePrice("");
    setSellingPrice("");
    setCategory("");
    setDescription("");
    setUnit("");

    setEditId(null);

    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.heading}>Products</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>
            + Add Product
          </Text>
        </TouchableOpacity>
      </View>

      {/* PRODUCT LIST */}
      <FlatList
        data={products}
        keyExtractor={(item) =>
          item.id.toString()
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No Products Added
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>
                {item.product_name}
              </Text>

              <Text style={styles.infoText}>
                Purchase Price: ₹
                {item.purchase_price}
              </Text>

              <Text style={styles.infoText}>
                Selling Price: ₹
                {item.selling_price}
              </Text>

              <Text style={styles.infoText}>
                Category: {item.category}
              </Text>

              <Text style={styles.infoText}>
                Unit: {item.unit}
              </Text>

              {item.description ? (
                <Text style={styles.infoText}>
                  Description:{" "}
                  {item.description}
                </Text>
              ) : null}
            </View>

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit(item)}
              >
                <Text style={styles.buttonText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  handleDelete(item.id)
                }
              >
                <Text style={styles.buttonText}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <Text style={styles.modalHeading}>
            {editId
              ? "Edit Product"
              : "Add Product"}
          </Text>

          <TextInput
            placeholder="Product Name"
            style={styles.input}
            value={productName}
            onChangeText={setProductName}
          />

          <TextInput
            placeholder="Purchase Price"
            style={styles.input}
            keyboardType="numeric"
            value={purchasePrice}
            onChangeText={setPurchasePrice}
          />

          <TextInput
            placeholder="Selling Price"
            style={styles.input}
            keyboardType="numeric"
            value={sellingPrice}
            onChangeText={setSellingPrice}
          />

          <TextInput
            placeholder="Category"
            style={styles.input}
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.label}>
            Unit Type
          </Text>

          <TextInput
            placeholder="Enter Unit"
            style={styles.input}
            value={unit}
            onChangeText={setUnit}
          />

          <View style={styles.unitContainer}>
            {[
              "Piece",
              "Box",
              "Meter",
              "Roll",
              "Packet",
            ].map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.unitButton,
                  unit === item &&
                    styles.activeUnitButton,
                ]}
                onPress={() => setUnit(item)}
              >
                <Text
                  style={[
                    styles.unitText,
                    unit === item &&
                      styles.activeUnitText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Description"
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveProduct}
          >
            <Text style={styles.saveButtonText}>
              {editId
                ? "Update Product"
                : "Save Product"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetForm}
          >
            <Text style={styles.cancelButtonText}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  heading: {
    fontSize: 28,
    fontWeight: "bold",
  },

  addButton: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },

  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 100,
    fontSize: 16,
    color: "gray",
  },

  card: {
    backgroundColor: "#f3f4f6",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  productName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },

  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: "#374151",
  },

  actionContainer: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },

  editButton: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 10,
  },

  deleteButton: {
    backgroundColor: "#dc2626",
    padding: 10,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },

  modalHeading: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 30,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },

  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },

  unitContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },

  unitButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },

  activeUnitButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },

  unitText: {
    color: "#000",
    fontWeight: "600",
  },

  activeUnitText: {
    color: "#fff",
  },

  saveButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});