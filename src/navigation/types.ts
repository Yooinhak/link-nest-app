export type MainStackParamList = {
  MainTabs: undefined;
  FolderDetail: { folderId: string; folderName: string; folderColor?: string; folderEmoji?: string };
  MemberManage: { groupId: string };
  Activity: undefined;
};

export type TabParamList = {
  Home: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};
