import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme, VictoryLegend } from "victory-native";
import { FontAwesome } from "@expo/vector-icons";
import Modal from "react-native-modal";
import PropTypes from "prop-types";

// Dummy FilterModal replacement (replace with your actual FilterModal component)
const FilterModal = ({ isVisible, onClose, onApplyFilter, currentFilterType }) => (
  <Modal isVisible={isVisible}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Select Filter</Text>
      <TouchableOpacity onPress={() => onApplyFilter({ type: "months", value: 1 })}>
        <Text style={styles.modalOption}>This Month</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onApplyFilter({ type: "months", value: 3 })}>
        <Text style={styles.modalOption}>Last 3 Months</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClose}>
        <Text style={styles.modalClose}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </Modal>
);

const PaymentReceivedCard = ({ selectedEmployeeName, employeeData, targetSale }) => {
  const [isVisibleFilterModal, setIsVisibleFilterModal] = useState(false);
  const [filter, setFilter] = useState({ type: "months", value: 1 });

  const parsedData = employeeData ? JSON.parse(employeeData) : null;

  const handleApplyFilter = (selectedFilter) => {
    setFilter(selectedFilter);
    setIsVisibleFilterModal(false);
  };

  const monthOrder = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
  ];

  const selectedData = useMemo(() => {
    if (!parsedData || !selectedEmployeeName) return [];

    const selectedNames = selectedEmployeeName.split(", ").map(n => n.toLowerCase());
    const totals = {
      currentMonthTotal: 0,
      lastThreeMonthsTotal: 0,
      monthlyTotals: {}
    };

    selectedNames.forEach(name => {
      const employee = parsedData[name.toLowerCase()];
      if (!employee) return;
      totals.currentMonthTotal += employee.currentMonthTotal || 0;
      totals.lastThreeMonthsTotal += employee.lastThreeMonthsTotal || 0;

      if (employee.monthlyTotals) {
        for (const [key, val] of Object.entries(employee.monthlyTotals)) {
          totals.monthlyTotals[key] = (totals.monthlyTotals[key] || 0) + val;
        }
      }
    });

    const monthlyArray = Object.entries(totals.monthlyTotals).map(([key, val]) => {
      const [month, year] = key.split(" ");
      return {
        name: `${month} ${year}`,
        month,
        year,
        Sales: val,
        Target: targetSale
      };
    }).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
    });

    return {
      currentMonthTotal: totals.currentMonthTotal,
      lastThreeMonthsTotal: totals.lastThreeMonthsTotal,
      monthlyTotals: monthlyArray
    };
  }, [parsedData, selectedEmployeeName]);

  const chartData = useMemo(() => {
    if (!selectedData || !selectedData.monthlyTotals) return [];
    return selectedData.monthlyTotals.map(item => ({
      x: item.name,
      y: item.Sales,
      target: item.Target
    }));
  }, [selectedData]);

  const targetAmount =
    filter.type === "months"
      ? filter.value * targetSale
      : (filter.value / 4) * targetSale;

  const filteredAmount =
    filter.value === 1
      ? selectedData.currentMonthTotal
      : selectedData.lastThreeMonthsTotal;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoice vs Target</Text>
        <TouchableOpacity onPress={() => setIsVisibleFilterModal(true)}>
          <FontAwesome name="ellipsis-v" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {!selectedEmployeeName ? (
        <View style={styles.lockedContainer}>
          <FontAwesome name="lock" size={42} color="#ff6b6b" />
          <Text style={styles.lockedText}>PLEASE SELECT AN EMPLOYEE</Text>
        </View>
      ) : (
        <>
          <Text style={styles.amountText}>
            ₹ {filteredAmount?.toLocaleString()}{" "}
            <Text style={styles.vsText}>vs ₹ {targetAmount.toLocaleString()}</Text>
          </Text>

          <ScrollView horizontal>
            <VictoryChart width={320} height={200} theme={VictoryTheme.material}>
              <VictoryAxis style={{ tickLabels: { fontSize: 10, angle: -30 } }} />
              <VictoryAxis dependentAxis />
              <VictoryLine
                data={chartData}
                x="x"
                y="y"
                style={{
                  data: { stroke: "#007bff" }
                }}
              />
              <VictoryLine
                data={chartData}
                x="x"
                y="target"
                style={{
                  data: { stroke: "#28a745", strokeDasharray: "5,5" }
                }}
              />
              <VictoryLegend x={60} y={10}
                orientation="horizontal"
                gutter={20}
                data={[
                  { name: "Sales", symbol: { fill: "#007bff" } },
                  { name: "Target", symbol: { fill: "#28a745" } }
                ]}
              />
            </VictoryChart>
          </ScrollView>
        </>
      )}

      <FilterModal
        isVisible={isVisibleFilterModal}
        onClose={() => setIsVisibleFilterModal(false)}
        onApplyFilter={handleApplyFilter}
        currentFilterType={filter?.type}
      />
    </View>
  );
};

PaymentReceivedCard.propTypes = {
  selectedEmployeeName: PropTypes.string.isRequired,
  targetSale: PropTypes.number.isRequired,
  employeeData: PropTypes.string.isRequired,
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333"
  },
  amountText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#007bff",
    marginVertical: 12
  },
  vsText: {
    color: "#dc3545",
    fontSize: 16,
    fontWeight: "600"
  },
  lockedContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40
  },
  lockedText: {
    color: "#888",
    fontSize: 16,
    marginTop: 10
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10
  },
  modalOption: {
    fontSize: 16,
    paddingVertical: 8,
    color: "#007bff"
  },
  modalClose: {
    fontSize: 16,
    color: "#ff6b6b",
    marginTop: 15
  }
});

export default PaymentReceivedCard;
