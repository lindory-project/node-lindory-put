# Lindory put

Linput is a small benchmark/test utility for the Lindory project.

It can create a fake RDF/skos dataset or load a custom one, and load it into Lindory. It also reports
the insertion progress according to the server response, and measures the time for each operation. 

## Installation
Use [npm](http://npmjs.org) to install:
    $ npm install -g lindory-put

## Usage

    $ linput [OPTIONS]



* `-p | --port <port_number>`: port of lindory/tapis server (default valut is set to apache port).
Port number can be replaced by 'apache' or 'restify', in order to use the pkgi.env values.
* `-s | --size <box_number>`: size of generated data (number of boxes, default value is set to 50).
Strings 'small', 'medium' and 'big' can also be used.
* `-f | --force`: force generating data (generate a file "/dataset/bench-put.xml").
* `-c | --clean`: clean lindory after bench, by removing the container(s).
* `-C | --copy`: requests a copy of the bench container once uploaded.
* `-l | --load <FILE>`: loads a custom XML file to send to the server. This disables any "-f | --force"
option, preventing Linput from overwriting your custom file.


## Output 

The command will display the progress of the operation, indicating the number of
characters sent by the server, which should be equal to the number of boxes processed.
If any, an error counter is displayed, showing the number of "x" received.

Upon completion of the test, the following information will be written for each request
(PUT and DELETE):

* Status Code of the response
* Start and end date
* Duration of the request


# License

[MIT/X11](./LICENSE)