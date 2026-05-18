import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import ClientsScreen from "../screens/ClientsScreen";
import ProductsScreen from "../screens/ProductsScreen";
import QuotationsScreen from "../screens/QuotationsScreen";
import BillingScreen from "../screens/BillingScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTitleAlign: "center",
          tabBarActiveTintColor: "#2563eb",
          tabBarInactiveTintColor: "#64748b",
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Clients" component={ClientsScreen} />
        <Tab.Screen name="Products" component={ProductsScreen} />
        <Tab.Screen name="Quotations" component={QuotationsScreen} />
        <Tab.Screen name="Billing" component={BillingScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
