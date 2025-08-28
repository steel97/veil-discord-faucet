# Veil Discord Faucet
Simple bot which gives few veil to users who request it once per 24 hours (can be configured)


## Configuration
see [.env.example](.env.example)

## Installing bot
clone repository and run command below with lastest dart sdk:
```
dart pub get
```

```bash
# copy required libs to root of the cloned repository
# for windows:
veil_light_plugin.dll
# for linux
libveil_light_plugin.so

# this libraries can be found on binary distribution of veil_wallet (https://github.com/steel97/veil_wallet)
```

Additionaly, on linux systems you should install sqlite3
```
sudo apt install libsqlite3-dev
```

## Build
```bash
dart run nyxx_commands:compile ./bin/veil_faucet.dart --no-compile
# for host os
dart compile exe ./out.g.dart --output ./veil_faucet.exe

# for linux:
dart compile exe ./out.g.dart --output ./veil_faucet --target-os=linux
```


## Running bot
you can run this bot with lastest nodejs by executing:

```
./veil_faucet
```

## Stopping bot
./kill.sh