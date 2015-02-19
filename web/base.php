<?php
/**
 * Created by PhpStorm.
 * User: willi_000
 * Date: 2/16/2015
 * Time: 5:31 PM
 */
?>

<?php

    session_start();

    $dbhost = "localhost";
    $dbname = "covelogins";
    $dbuser = "covehead";
    $dbpass = "covecolonies";

    mysql_connect($dbhost, $dbuser, $dbpass) or die("MySQL Error Code: " .mysql_error());
    mysql_select_db($dbname) or die("MySQL Error Code: " .mysql_error());
?>

