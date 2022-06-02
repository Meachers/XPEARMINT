import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import idl from './idl.json';
import kp from './keypair.json'
import { Buffer } from 'buffer';
window.Buffer = Buffer;

// SystemProgram is a reference to the Solana runtime!
const { SystemProgram, Keypair } = web3;

// Create a keypair for the account that will hold the GIF data.
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id from the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devnet.
const network = clusterApiUrl('devnet');

// Controls how we want to acknowledge when a transaction is "done".
const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = 'XpearmintLab';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const TEST_GIFS = [
	'https://media.giphy.com/media/nBaHkYEzY7N0SlQSAa/giphy.gif',
	'https://media.giphy.com/media/OhChrr46XfmxA3BoOr/giphy.gif',
	'https://media.giphy.com/media/YPz7GHPHR9tAQ5GoDJ/giphy.gif',
	'https://media.giphy.com/media/tK9wGsGc72LcznCSeU/giphy.gif',
  'https://media.giphy.com/media/S9i8jJxTvAKVHVMvvW/giphy.gif',
	'https://media.giphy.com/media/oF5oUYTOhvFnO/giphy.gif'
];


const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
  	return provider;
  }
  
  // Actions
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        const provider = window.solana;
        if (provider.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          return provider;
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          ); 
          
          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Either youre using a mobile device or you need to get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

  if (solana) {
    const response = await solana.connect();
    console.log('Connected with Public Key:', response.publicKey.toString());
    setWalletAddress(response.publicKey.toString());
  }
  };


  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };


  const sendGif = async () => {
  if (inputValue.length === 0) {
    console.log("No gif link given!")
    return
  }
  setInputValue('');
  console.log('Gif link:', inputValue);
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);

    await program.rpc.addGif(inputValue, {
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
      },
    });
    console.log("GIF successfully sent to program", inputValue)

    await getGifList();
  } catch (error) {
    console.log("Error sending GIF:", error)
  }
};

  
  


  const createGifAccount = async () => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    console.log("ping")
    await program.rpc.startStuffOff({
      accounts: {
        baseAccount: baseAccount.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
      signers: [baseAccount]
    });
    console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
    await getGifList();

  } catch(error) {
    console.log("Error creating BaseAccount account:", error)
  }
}

  const getGifList = async() => {
  try {
    const provider = getProvider();
    const program = new Program(idl, programID, provider);
    const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
    
    console.log("Got the account", account)
    setGifList(account.gifList)

  } catch (error) {
    console.log("Error in getGifList: ", error)
    setGifList(null);
  }
}


  
  //Render Functions
  const renderNotConnectedContainer = () => (
    <button className="cta-button connect-wallet-button" onClick={connectWallet}>
      Contribute Enthusiasm!
    </button>
  );


  
const renderConnectedContainer = () => {
// If we hit this, it means the program account hasn't been initialized.
  if (gifList === null) {
    return (
      <div className="connected-container">
        <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div>
    )
  } 
	// Otherwise, we're good! Account exists. User can submit GIFs.
	else {
    return(
      <div className="connected-container">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            sendGif();
          }}
        >
          <input
            type="text"
            placeholder="Enter gif link!"
            value={inputValue}
            onChange={onInputChange}
          />
          <button type="submit" className="cta-button submit-gif-button">
            Submit
          </button>
        </form>
        <div className="gif-grid">
					{/* We use index as the key instead, also, the src is now item.gifLink */}
          {gifList.map((item, index) => (
            <div className="gif-item" key={index}>
              <img src={item.gifLink} />
            </div>
          ))}
        </div>
      </div>
    )
  }
};

  
  
  // UseEffects
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  
 useEffect(() => {
  if (walletAddress) {
    console.log('Fetching GIF list...');
    getGifList()
  }
}, [walletAddress]);


  
return (
    <div className="App">
        {/*<div className={walletAddress ? 'authed-container' : 'container'}>*/}
       
        {/* 👇️ horizontal line with text */}
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center'}}>
            <div className= "horizontal-rule"style={{flex: 1, height: '1px', backgroundColor: '#00fe98'}} />
            <div><p style={{width: '140px', textAlign: 'center', margin: '0px'}}>June 1st 2022</p></div>
            <div style={{flex: 1, height: '1px', backgroundColor: '#00fe98'}} />
        </div>

        {/* 👇️ Body */}
        <div className='authed-container'>
                  {/* 👇️ Intro Section */}
                  <p  className="header">BREWIN' XPEARMINT EARTH</p>
                  <p className="sub-text">✨✨✨</p>
                  
                  <p className="sub-text">✨✨✨</p>
                  <p className="header">To <a className="a-custom" href="https://www.netflix.com/it/title/81336476" target="_blank" rel="noreferrer"> Restabilize the Planet</a></p>
                  <p className="sub-text-2">9 Billion Kagillion Fafillion Shabadadaloo Mlnshwn Gowashle Million USD </p>
                  <p className="sub-text">✨✨✨</p>
                  <p className="sub-text-2">Just a pinch of this: </p>
                
                
                  {/* 👇️ About Section */}      
                  <div className="connected-container">
                      <div className="gif-grid-2">
                          <div className="gif-item-2" key="https://media.giphy.com/media/L3q3iiaA31TkdKXtl8/giphy.gif"><img src="https://media.giphy.com/media/L3q3iiaA31TkdKXtl8/giphy.gif" alt="https://media.giphy.com/media/L3q3iiaA31TkdKXtl8/giphy.gif" /></div>
                      </div>
                      <p className="sub-text-2">    </p>
                      <p className="sub-text-2">+ </p>
                      <p className="sub-text-2">a dash of this: </p>
                      <div className="gif-grid">
                          <div className="gif-item-2" key="https://media.giphy.com/media/Mf9BAePdPYft08ECTN/giphy.gif"><img src="https://media.giphy.com/media/Mf9BAePdPYft08ECTN/giphy.gif" alt="https://media.giphy.com/media/Mf9BAePdPYft08ECTN/giphy.gif" /></div>
                      </div>
                      <p> </p>  
                      <p className="sub-text-2">+</p>
                      <p className="sub-text-2">Lots & lots of <a href="https://twitter.com/search?q=%23Solanafam&src=typed_query&f=live" target="_blank" rel="noreferrer">#Solanafam</a> x <a href="https://twitter.com/search?q=%23%F0%9F%A7%AA%F0%9F%8C%8E!!!&src=typed_query&f=live" target="_blank" rel="noreferrer">#🧪🌎!!!</a> </p>
                      <p className="sub-text">✨✨✨</p>
                  </div>

          
                  {/* 👇️ horizontal line with text */}
                  <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center',margin: '20px'}}>
                      <div className= "horizontal-rule"style={{flex: 1, height: '1px', backgroundColor: '#00fe98'}} />
                      <div><p style={{width: '140px', textAlign: 'center', margin: '0px'}}>June 1st 2022</p></div>
                      <div style={{flex: 1, height: '1px', backgroundColor: '#00fe98'}} />
                  </div>

          
                  {/* 👇️ Connect Phantom Wallet & Render GIF Wall */}
                  <div className="header-container">
                      {!walletAddress && renderNotConnectedContainer()}
                    
                          {walletAddress && renderConnectedContainer()}
                         
                  </div>  
                
                  
                  {/* 👇️ horizontal line with text */}
                  <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center',margin: '20px', }}>
                      <div className= "horizontal-rule"style={{flex: 1, height: '1px', backgroundColor: '#00fe98'}} />
                      <div><p style={{width: '140px', textAlign: 'center', margin: '0px'}}>June 1st 2022</p></div>
                      <div style={{flex: 1, height: '1px', backgroundColor: '#00fe98'}} />
                  </div>
          


                  {/* 👇️ Team & Frens Section */}
                  <div className="authed-container">
                      <p className="sub-text">✨✨✨</p>
                      <p className= "sub-text">Team & Frens!!!</p>
                      <p className="sub-text">✨✨✨</p>
                      <div className="gif-grid-team">     
                          <div className="gif-item" key="https://media.giphy.com/media/DYH297XiCS2Ck/giphy.gif">
                              <p className="sub-text-2">Miekka MacArthur</p>
                              <p className="sub-text-3">Co-Founder & Concept</p>
                              <img src="https://media.giphy.com/media/DYH297XiCS2Ck/giphy.gif" alt="https://media.giphy.com/media/DYH297XiCS2Ck/giphy.gif" />
                          </div>
                
                          <div className="gif-item" key="https://media.giphy.com/media/xT1R9LhksCF9YB0HMA/giphy.gif">
                              <p className="sub-text-2">Claudio Pollina</p>
                              <p className="sub-text-3">Co-founder &  Design</p>
                              <img src="https://media.giphy.com/media/xT1R9LhksCF9YB0HMA/giphy.gif" alt="https://media.giphy.com/media/xT1R9LhksCF9YB0HMA/giphy.gif" />
                          </div>
                
                          <div className="gif-item" key="https://media.giphy.com/media/9Y6n9TR7U07ew/giphy.gif">
                              <p className="sub-text-2">Gianluca Nardis</p>
                              <p className="sub-text-3">Producer &  Junior Design</p>
                              <img src="https://media.giphy.com/media/9Y6n9TR7U07ew/giphy.gif" alt="https://media.giphy.com/media/9Y6n9TR7U07ew/giphy.gif" />
                          </div>
                
                          <div className="gif-item" key="https://media.giphy.com/media/xSM46ernAUN3y/giphy.gif">
                              <p className="sub-text-2">Marco Di Vita</p>
                              <p className="sub-text-3">3D Generalist</p>
                              <img src="https://media.giphy.com/media/xSM46ernAUN3y/giphy.gif" alt="https://media.giphy.com/media/xSM46ernAUN3y/giphy.gif" />
                          </div> 
                                 
                          <div className="gif-item" key="https://media.giphy.com/media/LEdz8xl9uFxKw/giphy.gif">
                              <p className="sub-text-2">Gabriele Sanfilippo</p>
                              <p className="sub-text-3">Sound Design</p>
                              <img src="https://media.giphy.com/media/LEdz8xl9uFxKw/giphy.gif" alt="https://media.giphy.com/media/LEdz8xl9uFxKw/giphy.gif" />
                          </div>
                
                          <div className="gif-item" key="https://media.giphy.com/media/CyoQdbc7FHqqTpkSPI/giphy.gif">
                              <p className="sub-text-2">Gioele Casazza</p>
                              <p className="sub-text-3">UI UX Design</p>
                              <img src="https://media.giphy.com/media/CyoQdbc7FHqqTpkSPI/giphy.gif" alt="https://media.giphy.com/media/CyoQdbc7FHqqTpkSPI/giphy.gif" />
                          </div>
                
                          <div className="gif-item" key="https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif">
                              <p className="sub-text-2">Lorenzo Serafini</p>
                              <p className="sub-text-3">Animation</p>
                              <img src="https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif" alt="https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif" />
                          </div>
                
                          <div className="gif-item" key="https://media.giphy.com/media/F6PFPjc3K0CPe/giphy.gif">
                              <p className="sub-text-2">Viola Sannino</p>
                              <p className="sub-text-3">Social Art</p>
                              <img src="https://media.giphy.com/media/F6PFPjc3K0CPe/giphy.gif" alt="https://media.giphy.com/media/F6PFPjc3K0CPe/giphy.gif" />
                          </div>
                
                          <div className="gif-item" key="https://media.giphy.com/media/l2JJmXRcFoEJNXyEM/giphy.gif">
                              <p><a href="https://www.theholoverse.io/" target="_blank"
                            rel="noreferrer" className="sub-text-2">The HoloVerse</a></p>
                              <p className="sub-text-3">Real World Value hNFTs</p>
                              <img src="https://media.giphy.com/media/l2JJmXRcFoEJNXyEM/giphy.gif" alt="https://media.giphy.com/media/l2JJmXRcFoEJNXyEM/giphy.gif" />
                          </div>      
                      </div> 
                      {/* End Team & Friends Section */}
                
                      
                      {/* 👇️ Footer Section */}
                      <div className="">
                          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
                          <a className="footer-text" href={TWITTER_LINK} target="_blank" rel="noreferrer">{`@${TWITTER_HANDLE}`}</a>
                      </div>
                      {/* 👇END Footer Section */}
        </div>
      </div>
    </div>
  );
};

export default App;