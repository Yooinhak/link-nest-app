import React from 'react';

import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors } from '../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function Input({ label, error, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor={colors.textDisabled}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSub,
    marginLeft: 4,
  },
  input: {
    backgroundColor: colors.divider,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
    color: colors.ink,
  },
  inputError: {
    backgroundColor: colors.destructiveLight,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginLeft: 4,
  },
});
