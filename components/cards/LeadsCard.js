import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { AntDesign, FontAwesome, MaterialIcons } from "@expo/vector-icons";

dayjs.extend(isBetween);
const today = dayjs();
const isFirstFiveDays = today.date() <= 5;

const LeadsCard = ({ leads, selectedEmployeeName, setRewardCardForecast }) => {
  const [filterMode, setFilterMode] = useState("all");
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  const stages = {
    1: "Cold",
    2: "Warm",
    3: "Hot",
    4: "Closed",
    5: "First Call",
    6: "First Meeting",
    7: "Quotation",
    8: "Negotiation",
    9: "Payment Confirmation",
    10: "Order Confirmed",
    11: "Second Meeting",
    12: "Revision Of Products",
    13: "Second Call",
    14: "Third Call",
    15: "Lost",
  };

  const toggleFilterMode = () => {
    setFilterMode((prev) =>
      prev === "all" ? "currentMonth" : prev === "currentMonth" ? "starred" : "all"
    );
  };

  const filteredLeads = useMemo(() => {
    const employees = Array.isArray(selectedEmployeeName)
      ? selectedEmployeeName
      : selectedEmployeeName.split(",").map((e) => e.trim().toLowerCase());

    let filtered = leads.filter((lead) =>
      employees.includes(lead.SalesEmpName?.toLowerCase().trim())
    );

    if (filterMode === "currentMonth") {
      const start = today.startOf("month");
      const end = today.endOf("month");
      filtered = filtered.filter((lead) =>
        dayjs(lead.PredictedClosingDate).isBetween(start, end, null, "[]")
      );
    } else if (filterMode === "starred") {
      const now = new Date();
      filtered = filtered.filter((lead) => {
        const closing = new Date(lead.PredictedClosingDate);
        return (
          lead.OpportunityName &&
          closing.getMonth() === now.getMonth() &&
          closing.getFullYear() === now.getFullYear()
        );
      });
    }

    return filtered;
  }, [leads, selectedEmployeeName, filterMode]);

  const renderLeadItem = ({ item }) => {
    const lastStage =
      item.salesOpportunityDetails?.[item.salesOpportunityDetails.length - 1];
    const stageName = stages[lastStage?.StageKey] || "Unknown";

    return (
      <View style={styles.leadItem}>
        <View style={styles.leadRow}>
          <Text style={styles.leadLabel}>#{item.SequentialNo}</Text>
          {item.OpportunityName?.toLowerCase().startsWith("new") ? (
            <AntDesign name="star" size={16} color="gold" />
          ) : item.OpportunityName?.toLowerCase().startsWith("old") ? (
            <FontAwesome name="hourglass-start" size={16} color="gray" />
          ) : null}
        </View>
        <Text style={styles.leadText}>🧑 {item.CardName}</Text>
        <Text style={styles.leadText}>
          📅 {dayjs(item.PredictedClosingDate).format("YYYY-MM-DD")}
        </Text>
        <Text style={styles.leadText}>💰 ₹{item.MaxLocalTotal.toLocaleString()}</Text>
        <Text style={styles.leadText}>👤 {item.SalesEmpName}</Text>
        <Text style={styles.leadText}>📊 {stageName}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.button} onPress={toggleFilterMode}>
          <Text style={styles.buttonText}>
            {filterMode === "all"
              ? `Filter ${dayjs().format("MMMM")}'s Leads`
              : filterMode === "currentMonth"
              ? "Show Forecasted Leads"
              : "Show All Leads"}
          </Text>
          <AntDesign name="setting" size={16} color="white" />
        </TouchableOpacity>

        {isFirstFiveDays && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#28a745" }]}
            onPress={() => {
              // placeholder
              setRewardCardForecast(true);
            }}
          >
            <Text style={styles.buttonText}>Check Forecast</Text>
            <FontAwesome name="plus" size={16} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>
        {filterMode === "all"
          ? `Leads Till ${dayjs().format("MMMM")}`
          : filterMode === "currentMonth"
          ? `Leads for ${dayjs().format("MMMM")}`
          : "Forecasted Leads"}{" "}
        ({filteredLeads.length} leads)
      </Text>

      <Text style={styles.subtitle}>
        Total Value:{" "}
        <Text style={{ color: "green", fontWeight: "bold" }}>
          ₹
          {filteredLeads
            .reduce((acc, lead) => acc + lead.MaxLocalTotal, 0)
            .toLocaleString()}
        </Text>
      </Text>

      {isForecastLoading ? (
        <ActivityIndicator size="large" color="#917bff" />
      ) : (
        <FlatList
          data={filteredLeads}
          keyExtractor={(item) => item.SequentialNo.toString()}
          renderItem={renderLeadItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    backgroundColor: "#917bff",
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  leadItem: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
  },
  leadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  leadLabel: {
    fontWeight: "bold",
    fontSize: 13,
  },
  leadText: {
    fontSize: 13,
    marginVertical: 2,
  },
});

export default LeadsCard;
