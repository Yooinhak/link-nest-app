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

const MENU_WIDTH = 160;

export default function ContextMenu({ items, trigger }: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<View>(null);

  const handleOpen = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const { width: screenWidth } = Dimensions.get('window');
      const triggerRight = screenWidth - (x + width);

      setPosition({
        top: y + height + 6,
        right: Math.max(triggerRight - 4, 12),
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
        accessibilityRole="button"
        accessibilityLabel="더 보기"
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
            style={[styles.menu, { top: position.top, right: position.right }]}
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
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
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
    borderRadius: 14,
    minWidth: MENU_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[100],
  },
  menuIcon: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 15,
    color: colors.gray[800],
    fontFamily: 'LINESeedKR',
  },
  destructiveText: {
    color: colors.destructive,
  },
});
