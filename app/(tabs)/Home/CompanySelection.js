import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const CompanySelector = ({ companies, selectedCompany, onSelectCompany }) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Select Company</Text>
      <View style={styles.listContainer}>
        <TouchableOpacity
          onPress={() => onSelectCompany(null)}
          style={[styles.item, !selectedCompany && styles.selected]}
          activeOpacity={0.7}
        >
          <Text style={[styles.text, !selectedCompany && styles.selectedText]}>All</Text>
        </TouchableOpacity>
        {companies.map((item) => {
          const isSelected = item.company === selectedCompany;
          return (
            <TouchableOpacity
              key={item.id?.toString()}
              onPress={() => onSelectCompany(item.company)}
              style={[styles.item, isSelected && styles.selected]}
              activeOpacity={0.7}
            >
              <Text style={[styles.text, isSelected && styles.selectedText]}>
                {item.company}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  listContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 0,
  },
  item: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8, // Add margin bottom for wrapped items
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default CompanySelector;