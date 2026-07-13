import { useRef, useState } from "react";
import { Modal, View, Pressable, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera";
import { X, ScanLine } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Caption } from "@/components/ui/typography";

const PRODUCT_BARCODE_TYPES: BarcodeType[] = ["ean13", "ean8", "upc_a", "upc_e"];

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
  title?: string;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
  title = "Scan Barcode",
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const hasScanned = useRef(false);

  const handleBarcodeScanned = ({ data, type }: { data: string; type?: string }) => {
    if (hasScanned.current) return;
    hasScanned.current = true;
    console.log("[barcode scanner] detected:", JSON.stringify({ type, data }));
    onScanned(data);
  };

  const handleClose = () => {
    hasScanned.current = false;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      onShow={() => {
        hasScanned.current = false;
      }}
    >
      <View className="flex-1 bg-black">
        {permission?.granted ? (
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: PRODUCT_BARCODE_TYPES }}
            onBarcodeScanned={handleBarcodeScanned}
          >
            <View className="flex-1 justify-between p-6">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-bold text-lg">{title}</Text>
                <Button variant="ghost" size="icon" onPress={handleClose}>
                  <X size={24} color="#fff" />
                </Button>
              </View>

              <View className="items-center gap-3">
                <ScanLine size={48} color="#fff" />
                <Caption className="text-white text-center">
                  Line up the barcode within the frame
                </Caption>
              </View>
            </View>
          </CameraView>
        ) : (
          <View className="flex-1 items-center justify-center gap-4 p-6">
            {permission === null ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="text-white text-center">
                  Camera access is needed to scan barcodes.
                </Text>
                <Button onPress={requestPermission}>
                  <Text>Grant Camera Access</Text>
                </Button>
                <Pressable onPress={handleClose}>
                  <Caption className="text-white underline">Cancel</Caption>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
