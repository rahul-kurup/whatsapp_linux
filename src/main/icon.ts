import path from 'path';

const assetPath = [__dirname, '..', '..', 'assets'];

export default {
  loading: path.join(...assetPath, 'loading.png'),
  appIcon: path.join(...assetPath, 'logo.png'),
  appIconFilled: path.join(...assetPath, 'logoFilled.png'),
};
