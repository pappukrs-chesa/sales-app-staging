import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../ContextAPI/CartContext';
import ChesaLogo from '@/assets/images/chesa.png';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 32) / 2;

const ProductGrid = ({
  products,
  chairColors = {},
  suctionTypes = {},
  quantities = {},
  colors = {},
  remarks = {},
  onQuantityChange,
  onColorChange,
  onSuctionTypeChange,
  onRemarksChange,
  productbaseURL,
  handleAddToCart,
}) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [imageError, setImageError] = useState(false);

  const openModal = (product) => {
    setSelectedProduct(product);
    setImageError(false); // Reset image error when opening modal
  };
  
  const closeModal = () => setSelectedProduct(null);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openModal(item)}>
      <Image
        source={
          imageErrors[item.id]
            ? ChesaLogo
            : { uri: `${productbaseURL}${item.image}` }
        }
        onError={() =>
          setImageErrors((prev) => ({ ...prev, [item.id]: true }))
        }
        style={styles.image}
        resizeMode="contain"
      />
      <Text numberOfLines={2} style={styles.name}>
        {item.name}
      </Text>
      <Text style={styles.price}>
        {item.sapPrice && item.sapPrice !== 'Not Available'
          ? `₹${Number(item.sapPrice).toLocaleString()}`
          : 'N/A'}
      </Text>
    </TouchableOpacity>
  );

  const renderColorOptions = (product) => {
    const options = product.cat_name === 'Indian Chairs'
      ? [
          'CH-F - Purple', 'CH-P - Apple Green', 'CH-D - Dark Blue', 'CH-B - Sea Green',
          'CH-K - Putty', 'CH-E - Maroon', 'CH-C - Deep Blue', 'CH-O - Off White',
          'CH-Q - Silver', 'CH-H - Pink', 'CH-J - Yellow', 'CH-I - Orange',
          'CH-A - Gross Green', 'CH-L - Brown', 'CH-R - Sky Blue', 'CH-M - Copper',
        ]
      : (chairColors[product.name] || []).map(c => c.color);

    if (!options.length) return null;

    return (
      <View style={styles.optionContainer}>
        <Text style={styles.optionLabel}>Color Selection</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={colors[product.id] || ''}
            onValueChange={(value) => onColorChange(product.id, value)}
            style={styles.picker}
          >
            <Picker.Item label="Select Color" value="" />
            {options.map((color, i) => (
              <Picker.Item key={i} label={color} value={color} />
            ))}
          </Picker>
        </View>
      </View>
    );
  };

  const renderSuctionOptions = (product) => {
    let options = [];

    if (product.cat_name === 'Dental Chairs' && product.code === 'DCH 119') {
      options = [
        'Provision Suction', 'Suction 0.25 HP Mobile', 'Suction 0.25 HP INBUILT',
        'Durr VS-250', 'Durr VS-300'
      ];
    } else if (product.cat_name === 'Dental Chairs') {
      options = [
        'Pneumatic Suction', 'Suction 0.25 HP Mobile', 'Suction 0.25 HP INBUILT',
        'Durr VS-250', 'Durr VS-300'
      ];
    } else if (product.cat_name === 'Indian Chairs' && product.code === 'DCH 117') {
      options = ['Durr VS-250'];
    } else if (product.cat_name === 'Indian Chairs') {
      options = ['Suction 0.25 HP INBUILT'];
    }

    if (!options.length) return null;

    return (
      <View style={styles.optionContainer}>
        <Text style={styles.optionLabel}>Suction Type</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={suctionTypes[product.id] || ''}
            onValueChange={(value) => onSuctionTypeChange(product.id, value)}
            style={styles.picker}
          >
            <Picker.Item label="Select Suction Type" value="" />
            {options.map((suction, i) => (
              <Picker.Item key={i} label={suction} value={suction} />
            ))}
          </Picker>
        </View>
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      />

      <Modal 
        visible={!!selectedProduct} 
        transparent 
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {selectedProduct?.name}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={closeModal}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {selectedProduct && (
                <>
                  {/* Product Image */}
                  <View style={styles.imageContainer}>
                    <Image
                      source={
                        imageError || !selectedProduct?.image
                          ? ChesaLogo
                          : { uri: `${productbaseURL}${selectedProduct.image}` }
                      }
                      onError={() => setImageError(true)}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Product Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productCode}>
                      Code: {selectedProduct.code || 'N/A'}
                    </Text>
                    <Text style={styles.productPrice}>
                      {selectedProduct.sapPrice && selectedProduct.sapPrice !== 'Not Available'
                        ? `₹${Number(selectedProduct.sapPrice).toLocaleString()}`
                        : 'Price on Request'}
                    </Text>
                  </View>

                  {/* Quantity Section */}
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <View style={styles.quantityContainer}>
                      <TouchableOpacity
                        onPress={() =>
                          onQuantityChange(selectedProduct.id, Math.max(1, (quantities[selectedProduct.id] || 1) - 1))
                        }
                        style={[styles.quantityButton, styles.quantityButtonLeft]}
                      >
                        <Ionicons name="remove" size={20} color="#007AFF" />
                      </TouchableOpacity>
                      <View style={styles.quantityDisplay}>
                        <Text style={styles.quantityText}>{quantities[selectedProduct.id] || 1}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          onQuantityChange(selectedProduct.id, (quantities[selectedProduct.id] || 1) + 1)
                        }
                        style={[styles.quantityButton, styles.quantityButtonRight]}
                      >
                        <Ionicons name="add" size={20} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Color and Suction Options */}
                  {renderColorOptions(selectedProduct)}
                  {renderSuctionOptions(selectedProduct)}

                  {/* Remarks Section */}
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Additional Notes</Text>
                    <TextInput
                      placeholder="Add any special requirements or remarks..."
                      value={remarks[selectedProduct.id] || ''}
                      onChangeText={(text) => onRemarksChange(selectedProduct.id, text)}
                      style={styles.textInput}
                      multiline
                      textAlignVertical="top"
                      maxLength={500}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {/* Bottom Action */}
            <View style={styles.bottomAction}>
              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={() => {
                  handleAddToCart(selectedProduct);
                  closeModal();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="bag-add" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  grid: {
    padding: 8,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 8,
    padding: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 110,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  price: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.9,
    minHeight: height * 0.6,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 15,
    lineHeight: 26,
  },
  closeButton: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
  },
  
  // Image Section
  imageContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  
  // Product Info
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingHorizontal: 5,
  },
  productCode: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  
  // Section Containers
  sectionContainer: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  
  // Quantity Controls
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  quantityButtonRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  quantityDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    minWidth: 50,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  // Option Containers
  optionContainer: {
    marginBottom: 25,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  
  // Text Input
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  
  // Bottom Action
  bottomAction: {
    padding: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  addToCartButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addToCartText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProductGrid;