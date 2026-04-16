export interface ClickZone {
  id: string;
  targetScreenId: string;
  top: string | number;
  left: string | number;
  width: string | number;
  height: string | number;
}

export interface ScreenConfig {
  id: string;
  imagePath: string;
  zones: ClickZone[];
}

export const screens: Record<string, ScreenConfig> = {
  home: {
    id: 'home',
    imagePath: '/img/z7678517685250_a096c6af5f0f7e8276354d49a229ed55.jpg',
    zones: [
      {
        id: 'home-to-settings',
        targetScreenId: 'settings',
        top: '5%', left: '5%',
        width: '15%', height: '6%'
      },
      {
        id: 'home-to-messages',
        targetScreenId: 'messages',
        top: '88%', left: '60%',
        width: '30%', height: '8%'
      }
    ]
  },
  settings: {
    id: 'settings',
    imagePath: '/img/z7664560267589_b563c4a012ab27a7805114d3f922760b.jpg',
    zones: [
      {
        id: 'settings-to-home',
        targetScreenId: 'home',
        top: '2%', left: '5%',
        width: '20%', height: '8%'
      }
    ]
  },
  messages: {
    id: 'messages',
    imagePath: '/img/z7664560277365_b83bfdb2e166e578d769010bba8c1f36.jpg',
    zones: [
      {
        id: 'messages-to-home',
        targetScreenId: 'home',
        top: '4%', left: '5%',
        width: '15%', height: '6%'
      }
    ]
  }
};
