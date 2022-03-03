import { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { useEthereum } from '@decentology/hyperverse-ethereum';
import { useToken } from '@decentology/hyperverse-ethereum-token';
import {
	Box,
	Item,
	TriggerContainer,
	Trigger,
	Parameters,
	Input,
	Content,
	Button,
} from '../ComponentStyles';

const Mint = ({ instance }: { instance: boolean }) => {
	const { address } = useEthereum();
	const { Mint } = useToken();
	const { mutate } = Mint();
	const [amount, setAmount] = useState(0);

	const mint = async () => {
		try {
			const instanceData = {
				amount: amount,
			};

			mutate(instanceData);
		} catch (error) {
			throw error;
		}
	};

	return (
		<Box>
			<h4>Mint</h4>
			<p>Mint more tokens</p>
			<Accordion.Root type="single" collapsible>
				<Item value="item-1">
					<TriggerContainer>
						<Trigger disabled={!address || !instance}>
							{!address
								? 'Connect Wallet'
								: !instance
								? 'You need an instance'
								: 'Mint'}
						</Trigger>
					</TriggerContainer>
					<Parameters>
						<Content>
							<Input
								type="number"
								min="0"
								placeholder="Amount"
								onChange={(e) => setAmount(e.currentTarget.valueAsNumber)}
							/>
							<Button onClick={mint}>{!address ? 'Connet Wallet' : 'Mint'}</Button>
						</Content>
					</Parameters>
				</Item>
			</Accordion.Root>
		</Box>
	);
};

export default Mint;
