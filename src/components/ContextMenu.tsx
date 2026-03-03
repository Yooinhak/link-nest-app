import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../constants/theme';

export interface ContextMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  icon?: React.ReactNode;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  trigger: React.ReactNode;
}

export default function ContextMenu({ items, trigger }: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<View>(null);

  const handleOpen = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const { width: screenWidth } = Dimensions.get('window');
      setPosition({
        x: Math.min(x + width, screenWidth - 160),
        y: y + height + 4,
      });
      setVisible(true);
    });
  }, []);

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        onPress={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
        activeOpacity={0.5}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {trigger}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View
            style={[styles.menu, { top: position.y, left: position.x - 140 }]}
            onStartShouldSetResponder={() => true}
          >
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, index < items.length - 1 && styles.menuItemBorder]}
                onPress={() => {
                  setVisible(false);
                  setTimeout(item.onPress, 200);
                }}
                activeOpacity={0.5}
              >
                {item.icon && <View style={styles.menuIcon}>{item.icon}</View>}
                <Text style={[styles.menuText, item.destructive && styles.destructiveText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 16,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    color: colors.gray[800],
    fontWeight: '500',
  },
  destructiveText: {
    color: colors.destructive,
  },
});
