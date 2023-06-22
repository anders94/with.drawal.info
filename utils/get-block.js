const { createPublicClient, http } = require('viem');
const { mainnet } = require('viem/chains');

(async () => {
    const client = createPublicClient({
	chain: mainnet,
	transport: http('http://10.20.2.2:8545'),
    });

    //const blockNumber = await client.getBlockNumber(); // get latest block number
    //const block = await client.getBlock(blockNumber);
    //console.log('latest block:', blockNumber, 'timestamp', new Date(Number(block.timestamp) * 1000));

    const firstBlock = await client.getBlock({blockNumber: 11365165});
    console.log(firstBlock.timestamp);
    console.log(new Date(Number(firstBlock.timestamp * 1000n)));

    console.log(firstBlock);
    // merge was around block 11365166
    
})();
