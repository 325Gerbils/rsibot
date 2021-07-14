package main

import (
	"fmt"
	"io/ioutil"
	"net/http"
	// "os"
	// "os/exec"
)

func main() {
	/* go func() {
		cmd := exec.Command("python3", "rsibot-web.py")
		cmd.Stdin = os.Stdin
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		err := cmd.Run()
		if err != nil {
			panic(err)
		}
	}() */

	http.HandleFunc("/json", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			data, err := ioutil.ReadFile("./state.json")
			if err != nil {
				panic(err)
			}
			fmt.Fprintf(w, "%s", data)
		}
		if r.Method == "POST" {
			body, err := ioutil.ReadAll(r.Body)
			if err != nil {
				panic(err)
			}
			err = ioutil.WriteFile("./state.json", body, 0644)
			if err != nil {
				panic(err)
			}
		}
	})

	http.HandleFunc("/dashboard", func(w http.ResponseWriter, r *http.Request) {
		data, err := ioutil.ReadFile("./index.html")
		if err != nil {
			panic(err)
		}
		fmt.Fprintf(w, "%s", data)
	})

    http.HandleFunc("/pwa.webmanifest", func(w http.ResponseWriter, r *http.Request) {
		data, err := ioutil.ReadFile("./pwa.webmanifest")
		if err != nil {
			panic(err)
		}
		fmt.Fprintf(w, "%s", data)
	})

    http.Handle("/icons/", http.StripPrefix("/icons/", http.FileServer(http.Dir("./icons/"))))

	/* http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/dashboard", http.StatusFound)
	}) */

    fmt.Println("Started")
	panic(http.ListenAndServe(":80", nil))
}
