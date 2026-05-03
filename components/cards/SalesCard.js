import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "react-native-paper";
import { AntDesign } from "@expo/vector-icons";
import styled from "styled-components/native";

const SalesCard = ({ selectedEmployeeName, employeeData, targetSale }) => {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <AntDesign name="user" size={24} color="#007bff" />
          <Text style={styles.title}>Employee Sales</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.content}>
          <Text style={styles.value}>₹{employeeData.month?.toLocaleString() || "0"}</Text>
          <Text style={styles.label}>This Month</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Total</Text>
            <Text style={styles.footerValue}>₹{employeeData.total?.toLocaleString() || "0"}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>This Week</Text>
            <Text style={styles.footerValue}>₹{employeeData.week?.toLocaleString() || "0"}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 10,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
    color: "#333",
  },
  divider: {
    marginVertical: 10,
    backgroundColor: "#e0e0e0",
  },
  content: {
    alignItems: "center",
    paddingVertical: 10,
  },
  value: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007bff",
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  footerItem: {
    alignItems: "center",
  },
  footerLabel: {
    fontSize: 14,
    color: "#666",
  },
  footerValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 5,
  },
});

export default SalesCard;