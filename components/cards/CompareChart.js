import React from "react";
import { View, Text, Dimensions } from "react-native";
import { BarChart } from "react-native-chart-kit";
import { Card } from "react-native-paper";

const CompareChartComponent = ({ selectedEmployeeName, employeeData }) => {
  const screenWidth = Dimensions.get("window").width;

  // Sample data - replace with actual data from props
  const data = {
    labels: selectedEmployeeName.split(", "),
    datasets: [
      {
        data: [125000, 98000, 75000], // Sample sales data
      },
    ],
  };

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.5,
  };

  return (
    <Card>
      <Card.Content>
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 15 }}>
          Sales Comparison
        </Text>
        <BarChart
          data={data}
          width={screenWidth * 0.85}
          height={220}
          yAxisLabel="₹"
          chartConfig={chartConfig}
          verticalLabelRotation={30}
          fromZero
          showValuesOnTopOfBars
        />
      </Card.Content>
    </Card>
  );
};

export default CompareChartComponent;