import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import HomeScreen from "../screens/HomeScreen";
import BillingScreen from "../screens/BillingScreen";
import BillHistoryScreen from "../screens/BillHistoryScreen";
import ProductsScreen from "../screens/ProductsScreen";
import QuotationsScreen from "../screens/QuotationsScreen";
import ClientsScreen from "../screens/ClientsScreen";
import StockScreen from "../screens/StockScreen";

const Drawer = createDrawerNavigator();

const drawerIcons = {
  Home: "home-outline",
  Billing: "receipt-outline",
  "Bill History": "time-outline",
  Products: "cube-outline",
  Quotations: "document-text-outline",
  Clients: "people-outline",
  Stock: "layers-outline",
};

function CustomDrawerContent(props) {
  return (
    <View style={styles.drawerShell}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
      >
        <View style={styles.drawerHeader}>
          <View style={styles.logoBox}>
            <Ionicons name="flash" size={28} color="#ffffff" />
          </View>

          <Text style={styles.appName}>Electrical Billing Management</Text>
          <Text style={styles.tagline}>Smart Billing & Inventory Solution</Text>
        </View>

        <View style={styles.drawerItems}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      <View style={styles.brandingCard}>
        <Text style={styles.brandingLabel}>Developed by</Text>
        <Text style={styles.brandingName}>Sahid Khan</Text>
        <Text style={styles.brandingRole}>Associate Full Stack Developer</Text>
      </View>
    </View>
  );
}

export default function BottomTabs() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        initialRouteName="Home"
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={({ navigation, route }) => ({
          drawerActiveBackgroundColor: "#eff6ff",
          drawerActiveTintColor: "#1d4ed8",
          drawerInactiveTintColor: "#475569",
          drawerItemStyle: styles.drawerItem,
          drawerLabelStyle: styles.drawerLabel,
          drawerStyle: styles.drawer,
          headerLeft: () => (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => navigation.openDrawer()}
            >
              <Ionicons name="menu" size={24} color="#0f172a" />
            </TouchableOpacity>
          ),
          headerShadowVisible: false,
          headerStyle: styles.header,
          headerTitle: route.name,
          headerTitleAlign: "left",
          headerTitleStyle: styles.headerTitle,
          sceneStyle: styles.scene,
          drawerIcon: ({ color, focused, size }) => (
            <View
              style={[
                styles.iconWrap,
                focused && styles.activeIconWrap,
              ]}
            >
              <Ionicons
                name={drawerIcons[route.name] || "ellipse-outline"}
                size={size}
                color={color}
              />
            </View>
          ),
        })}
      >
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen name="Billing" component={BillingScreen} />
        <Drawer.Screen name="Bill History" component={BillHistoryScreen} />
        <Drawer.Screen name="Products" component={ProductsScreen} />
        <Drawer.Screen name="Quotations" component={QuotationsScreen} />
        <Drawer.Screen name="Clients" component={ClientsScreen} />
        <Drawer.Screen name="Stock" component={StockScreen} />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: "#f4f7fb",
  },
  header: {
    backgroundColor: "#f4f7fb",
    elevation: 0,
    height: 96,
  },
  headerTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "900",
  },
  menuButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    marginLeft: 18,
    marginRight: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    width: 46,
    elevation: 3,
  },
  drawer: {
    backgroundColor: "#f8fafc",
    borderBottomRightRadius: 28,
    borderTopRightRadius: 28,
    width: 316,
  },
  drawerShell: {
    backgroundColor: "#f8fafc",
    flex: 1,
  },
  drawerContent: {
    paddingBottom: 18,
  },
  drawerHeader: {
    backgroundColor: "#0f172a",
    borderRadius: 26,
    margin: 16,
    padding: 18,
  },
  logoBox: {
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    marginBottom: 16,
    width: 54,
  },
  appName: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
  },
  tagline: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 8,
  },
  drawerItems: {
    paddingHorizontal: 10,
  },
  drawerItem: {
    borderRadius: 18,
    marginHorizontal: 8,
    marginVertical: 3,
    paddingVertical: 2,
  },
  drawerLabel: {
    fontSize: 15,
    fontWeight: "900",
    marginLeft: -12,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  activeIconWrap: {
    backgroundColor: "#dbeafe",
  },
  brandingCard: {
    backgroundColor: "#ffffff",
    borderColor: "#dbeafe",
    borderRadius: 22,
    borderWidth: 1,
    margin: 16,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  brandingLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  brandingName: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  brandingRole: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
});
