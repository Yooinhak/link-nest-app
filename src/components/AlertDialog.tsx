import React from 'react';

import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../constants/theme';

interface AlertDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  onConfirm: () => void;
  destructive?: boolean;
}

export default function AlertDialog({
  visible,
  onClose,
  title,
  description,
  cancelText = '취소',
  confirmText = '확인',
  onConfirm,
  destructive = false,
}: AlertDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기">
        <View style={styles.dialog} onStartShouldSetResponder={() => true} accessibilityRole="alert">
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            {description && <Text style={styles.description}>{description}</Text>}
          </View>
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button]} onPress={onClose} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={cancelText}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, destructive ? styles.destructiveBtn : styles.confirmBtn]}
              onPress={() => {
                onConfirm();
                onClose();
              }}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={confirmText}
            >
              <Text style={[styles.confirmText, destructive && styles.destructiveText]}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  dialog: {
    backgroundColor: colors.white,
    borderRadius: 20,
    width: '100%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontFamily: 'LINESeedKR-Bold',
    color: colors.gray[900],
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    fontFamily: 'LINESeedKR',
    color: colors.gray[500],
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.gray[100],
  },
  confirmBtn: {
    backgroundColor: colors.primary,
  },
  destructiveBtn: {
    backgroundColor: colors.destructive,
  },
  cancelText: {
    fontSize: 15,
    color: colors.gray[600],
    fontFamily: 'LINESeedKR-Bold',
  },
  confirmText: {
    fontSize: 15,
    color: colors.white,
    fontFamily: 'LINESeedKR-Bold',
  },
  destructiveText: {
    color: colors.white,
  },
});
