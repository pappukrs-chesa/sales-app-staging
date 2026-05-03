import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card, Checkbox, Divider } from "react-native-paper";
import { AntDesign } from "@expo/vector-icons";
import Modal from "react-native-modal";

const SalesEmployeeCard = ({
  salesEmployees,
  selectedEmployee,
  onEmployeeChange,
  employeeSales,
  targetSale,
  status,
  difference,
  monthlySales,
}) => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [tempSelected, setTempSelected] = useState(selectedEmployee);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const handleApply = () => {
    onEmployeeChange(tempSelected);
    toggleModal();
  };

  const toggleEmployee = (employee) => {
    if (tempSelected.includes(employee)) {
      setTempSelected(tempSelected.filter((e) => e !== employee));
    } else {
      setTempSelected([...tempSelected, employee]);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <AntDesign name="team" size={24} color="#007bff" />
          <Text style={styles.title}>Sales Team</Text>
          <TouchableOpacity onPress={toggleModal} style={styles.selectButton}>
            <Text style={styles.selectButtonText}>Select Employees</Text>
          </TouchableOpacity>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>Selected:</Text>
            <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
              {selectedEmployee.join(", ") || "None"}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly Target:</Text>
            <Text style={styles.value}>₹{targetSale.toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Monthly Sales:</Text>
            <Text style={styles.value}>₹{monthlySales.toLocaleString()}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <View style={[styles.statusIndicator, styles[status]]}>
              <Text style={styles.statusText}>
                {status === "success"
                  ? "Target Achieved"
                  : status === "warning"
                  ? `₹${difference.toLocaleString()} to target`
                  : `₹${difference.toLocaleString()} behind`}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>

      <Modal isVisible={isModalVisible}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Employees</Text>
          <View style={styles.checkboxContainer}>
            {salesEmployees.map((employee) => (
              <View key={employee.username} style={styles.checkboxRow}>
                <Checkbox
                  status={
                    tempSelected.includes(employee.username) ? "checked" : "unchecked"
                  }
                  onPress={() => toggleEmployee(employee.username)}
                  color="#007bff"
                />
                <Text style={styles.checkboxLabel}>{employee.username}</Text>
              </View>
            ))}
          </View>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              onPress={toggleModal}
              style={[styles.modalButton, styles.cancelButton]}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={[styles.modalButton, styles.applyButton]}
            >
              <Text style={styles.buttonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    color: "#333",
  },
  selectButton: {
    backgroundColor: "#007bff",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  selectButtonText: {
    color: "#fff",
    fontSize: 12,
  },
  divider: {
    marginVertical: 10,
    backgroundColor: "#e0e0e0",
  },
  content: {
    paddingVertical: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 5,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    maxWidth: "60%",
  },
  statusIndicator: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  success: {
    backgroundColor: "#d4edda",
  },
  warning: {
    backgroundColor: "#fff3cd",
  },
  error: {
    backgroundColor: "#f8d7da",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  checkboxContainer: {
    maxHeight: 300,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    width: "48%",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  applyButton: {
    backgroundColor: "#007bff",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default SalesEmployeeCard;