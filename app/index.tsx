import React, { useEffect, useState } from "react";
import { View, Button, Text } from "react-native";
import * as RNIap from "react-native-iap";

const subscriptionSkus = ["monthly_599", "yearly_2999"];

export default function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        await RNIap.initConnection();
        const items = await RNIap.getSubscriptions(subscriptionSkus);
        setProducts(items);
      } catch (err) {
        console.warn("IAP Error:", err);
      }
    };

    init();

    return () => {
      RNIap.endConnection();
    };
  }, []);

  const buy = async (sku) => {
    try {
      await RNIap.requestSubscription(sku);
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      {products.map((p) => (
        <View key={p.productId} style={{ marginBottom: 20 }}>
          <Text>{p.title} - {p.localizedPrice}</Text>
          <Button title="Buy" onPress={() => buy(p.productId)} />
        </View>
      ))}
      <Button title="Restore Purchases" onPress={RNIap.restorePurchases} />
    </View>
  );
}
