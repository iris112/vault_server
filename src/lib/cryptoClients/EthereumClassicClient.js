import debug        from 'debug'
import EthereumClient from './EthereumClient'

const log = debug('CCVault:EthereumClassicClient')

export default class EthereumClassicClient extends EthereumClient {

  async getNetworkName(networkId) {
    switch (networkId) {
    case 0: return 'Olympic'
    case 1: return 'Homestead'
    case 2: return 'Morden'
    default: return 'Unknown'
    }
  }

}
